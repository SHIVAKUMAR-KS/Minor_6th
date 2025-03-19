import { YOUTUBE_API_KEY } from '~/constants';
import { YoutubeTranscript } from 'youtube-transcript';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '~/constants';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface YouTubeChannel {
  id: string;
  url: string;
  handle?: string;
  banner_img?: string;
  profile_image: string;
  name: string;
  subscribers: string;
  videos_count: number;
  created_date?: string;
  views: string;
  description: string;
  location?: string;
}

interface YouTubeVideo {
  id: string;
  url: string;
  title: string;
  likes: string;
  views: string;
  published_at: string;
  description: string;
  comments: string;
  preview_image: string;
  youtuber_id: string;
  tags?: string[];
}

interface VideoStats {
  statistics: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
  tags: string[];
}

interface PlaylistResponse {
  items: Array<{
    contentDetails: {
      videoId: string;
    };
    snippet: {
      title: string;
      publishedAt: string;
      description: string;
      thumbnails: {
        high?: { url: string };
        default?: { url: string };
      };
    };
  }>;
  nextPageToken?: string;
}

interface VideoResponse {
  items: Array<{
    id: string;
    snippet: {
      tags?: string[];
    };
    statistics: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
    };
  }>;
}

interface VideoItem {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    thumbnails?: {
      maxres?: { url?: string };
      high?: { url?: string };
    };
    tags?: string[];
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
  contentDetails?: {
    videoId?: string;
  };
}

// Extract channel ID from URL
export function extractChannelId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // Handle different URL formats
    if (pathname.startsWith('/@')) {
      // Handle handle-based URLs (e.g., youtube.com/@username)
      return pathname.slice(2);
    } else if (pathname.startsWith('/channel/')) {
      // Handle channel ID URLs (e.g., youtube.com/channel/UC...)
      return pathname.split('/')[2];
    } else if (pathname.startsWith('/user/')) {
      // Handle legacy username URLs (e.g., youtube.com/user/username)
      return pathname.split('/')[2];
    }
  } catch (error) {
    console.error('Invalid URL:', error);
  }
  return null;
}

// Fetch channel data
export async function fetchChannelData(channelIdentifier: string): Promise<YouTubeChannel> {
  // First try to get channel by custom URL/handle
  let channelResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${channelIdentifier}&type=channel&key=${YOUTUBE_API_KEY}`
  );

  if (!channelResponse.ok) {
    throw new Error('Failed to fetch channel');
  }

  let channelData = await channelResponse.json();
  let channelId = channelData.items?.[0]?.id?.channelId;

  if (!channelId) {
    // If not found by handle, try using the input as a channel ID
    channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&id=${channelIdentifier}&key=${YOUTUBE_API_KEY}`
    );
    
    if (!channelResponse.ok) {
      throw new Error('Failed to fetch channel');
    }

    channelData = await channelResponse.json();
    if (!channelData.items || channelData.items.length === 0) {
      throw new Error('Channel not found');
    }

    channelId = channelData.items[0].id;
  }

  // Get full channel details
  const fullChannelResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&id=${channelId}&key=${YOUTUBE_API_KEY}`
  );

  if (!fullChannelResponse.ok) {
    throw new Error('Failed to fetch channel details');
  }

  const fullChannelData = await fullChannelResponse.json();
  const channel = fullChannelData.items[0];

  return {
    id: channel.id,
    url: `https://youtube.com/channel/${channel.id}`,
    handle: channel.snippet.customUrl,
    banner_img: channel.brandingSettings.image?.bannerExternalUrl,
    profile_image: channel.snippet.thumbnails.high.url,
    name: channel.snippet.title,
    subscribers: channel.statistics.subscriberCount,
    videos_count: parseInt(channel.statistics.videoCount),
    created_date: channel.snippet.publishedAt,
    views: channel.statistics.viewCount,
    description: channel.snippet.description,
    location: channel.snippet.country,
  };
}

// Fetch channel videos
export const fetchChannelVideos = async (channelId: string) => {
  try {
    // Get channel's uploads playlist ID
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${YOUTUBE_API_KEY}`
    );
    
    if (!channelResponse.ok) {
      throw new Error('Failed to fetch channel');
    }

    const channelData = await channelResponse.json();
    const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    
    if (!uploadsPlaylistId) {
      throw new Error('No uploads playlist found');
    }

    // Get videos from uploads playlist
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50&key=${YOUTUBE_API_KEY}`
    );

    if (!videosResponse.ok) {
      throw new Error('Failed to fetch videos');
    }

    const videosData = await videosResponse.json();
    const videoIds = videosData.items
      ?.map((item: any) => item.contentDetails?.videoId)
      .filter((id: string | undefined): id is string => typeof id === 'string');

    if (!videoIds?.length) {
      return [];
    }

    // Remove duplicate videoIds
    const uniqueVideoIds = [...new Set(videoIds)];

    // Get video details
    const videoDetailsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${uniqueVideoIds.join(',')}&key=${YOUTUBE_API_KEY}`
    );

    if (!videoDetailsResponse.ok) {
      throw new Error('Failed to fetch video details');
    }

    const videoDetailsData = await videoDetailsResponse.json();
    return videoDetailsData.items?.map((video: any) => ({
      id: video.id || crypto.randomUUID(),
      url: `https://youtube.com/watch?v=${video.id}`,
      title: video.snippet?.title || '',
      likes: video.statistics?.likeCount || '0',
      views: video.statistics?.viewCount || '0',
      published_at: video.snippet?.publishedAt ? new Date(video.snippet.publishedAt).toISOString() : new Date().toISOString(),
      description: video.snippet?.description || '',
      comments: video.statistics?.commentCount || '0',
      preview_image: video.snippet?.thumbnails?.maxres?.url || video.snippet?.thumbnails?.high?.url,
      youtuber_id: channelId,
      tags: video.snippet?.tags || [],
    })) || [];
  } catch (error) {
    console.error('Error fetching videos:', error);
    return [];
  }
};

export const fetchVideoSubtitles = async (videoId: string) => {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    return transcript.map(item => item.text).join(' ');
  } catch (error) {
    console.error('Error fetching subtitles:', error);
    return null;
  }
};

// Helper function to extract keywords from text
function extractKeywords(text: string, maxKeywords: number = 5): string[] {
  // Remove special characters and convert to lowercase
  const cleanText = text.toLowerCase().replace(/[^\w\s]/g, '');
  
  // Split into words and remove common words
  const commonWords = new Set(['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at']);
  const words = cleanText.split(/\s+/).filter(word => !commonWords.has(word));
  
  // Count word frequencies
  const wordCount = new Map<string, number>();
  words.forEach(word => {
    if (word.length > 3) { // Only consider words longer than 3 characters
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    }
  });
  
  // Sort by frequency and get top keywords
  return Array.from(wordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

// Helper function to estimate video duration from transcript
function estimateDuration(transcript: string): string {
  const wordsPerMinute = 150; // Average speaking rate
  const minutes = Math.ceil(transcript.split(/\s+/).length / wordsPerMinute);
  return `${minutes} minutes`;
}

export const analyzeVideoContent = async (videoId: string, title: string, subtitles: string) => {
  try {
    // Truncate subtitles if too long (OpenAI has token limits)
    const truncatedSubtitles = subtitles.slice(0, 2000) + (subtitles.length > 2000 ? '...' : '');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'user',
          content: `Analyze this YouTube video content based on its title and subtitles:

Title: ${title}

Content:
${truncatedSubtitles}

Provide a concise analysis in this format:
1. Main Topic: [1-2 sentences]
2. Key Points: [3-4 bullet points]
3. Target Audience: [1 sentence]
4. Content Quality: [High/Medium/Low with brief explanation]
5. SEO Keywords: [5-7 relevant keywords]`
        }],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to analyze video content');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error analyzing video content:', error);
    return null;
  }
};

// Helper function to detect if text contains code snippets
function containsCodeSnippets(text: string): boolean {
  const codeIndicators = [
    /\b(function|class|const|let|var|if|else|for|while|return|import|export)\b/,
    /\b(public|private|protected|void|int|string|boolean|array)\b/,
    /\b(console\.log|print|def|import|from|return)\b/,
    /\b(html|css|javascript|python|java|c\+\+|php|ruby|swift|kotlin)\b/i,
    /\b(api|database|server|client|framework|library)\b/i,
    /\b(git|github|docker|kubernetes|aws|azure)\b/i,
    /\b(algorithm|data structure|programming|development)\b/i,
  ];
  
  return codeIndicators.some(pattern => pattern.test(text));
}

// Helper function to extract code snippets from text
function extractCodeSnippets(text: string): string[] {
  const codeBlocks = text.match(/```[\s\S]*?```/g) || [];
  const inlineCode = text.match(/`[^`]+`/g) || [];
  
  return [...codeBlocks, ...inlineCode].map(code => code.replace(/```/g, '').replace(/`/g, ''));
}

// Helper function to generate short notes from transcript
function generateShortNotes(transcript: string) {
  // Split transcript into sentences
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Convert sentences into bullet points and limit to 5 most important points
  const points = sentences
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length > 0)
    .slice(0, 5) // Limit to 5 points
    .map(sentence => `• ${sentence}`);

  // Extract code snippets
  const codeSnippets = extractCodeSnippets(transcript);

  return {
    points,
    codeSnippets
  };
}

// Helper function to detect if content is DSA-related
function isDSARelated(text: string): boolean {
  const dsaKeywords = [
    // Data Structures
    /\b(array|linked list|stack|queue|tree|graph|hash table|heap|trie)\b/i,
    // Algorithms
    /\b(sorting|searching|binary search|bubble sort|quick sort|merge sort|insertion sort|selection sort)\b/i,
    /\b(depth first search|breadth first search|dfs|bfs|dijkstra|kruskal|prim)\b/i,
    // Complexity
    /\b(time complexity|space complexity|big o|o\(n\)|o\(n\^2\)|o\(log n\))\b/i,
    // Problem Solving
    /\b(algorithm|problem solving|optimization|recursion|iteration|dynamic programming)\b/i,
  ];
  
  return dsaKeywords.some(pattern => pattern.test(text));
}

// Helper function to generate pseudo code from transcript
function generatePseudoCode(transcript: string): string {
  // Split transcript into sentences
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Look for algorithm-related sentences
  const algorithmPatterns = [
    /\b(algorithm|function|method|procedure|step|loop|if|else|return|while|for)\b/i,
    /\b(initialize|declare|create|set|assign|update|increment|decrement)\b/i,
    /\b(compare|check|verify|validate|test|condition)\b/i,
    /\b(iterate|traverse|loop through|go through|process)\b/i,
    /\b(store|save|keep|maintain|hold)\b/i,
    /\b(calculate|compute|determine|find|search)\b/i,
    /\b(swap|exchange|replace|update|modify)\b/i,
    /\b(merge|combine|join|connect|link)\b/i,
    /\b(split|divide|partition|separate)\b/i,
    /\b(sort|arrange|order|organize)\b/i,
  ];

  // Filter and clean algorithm-related sentences
  const algorithmSentences = sentences.filter(sentence => 
    algorithmPatterns.some(pattern => pattern.test(sentence))
  );

  if (algorithmSentences.length === 0) return '';

  // Clean and format sentences into logical steps
  const logicalSteps = algorithmSentences
    .slice(0, 8) // Limit to 8 steps
    .map((sentence, index) => {
      // Clean the sentence
      let step = sentence.trim()
        .replace(/\b(algorithm|function|method|procedure)\b/i, '')
        .replace(/\b(step|loop|if|else|return|while|for)\b/i, match => match.toUpperCase())
        .replace(/\b(initialize|declare|create|set|assign)\b/i, 'SET')
        .replace(/\b(compare|check|verify|validate|test)\b/i, 'CHECK')
        .replace(/\b(iterate|traverse|loop through|go through|process)\b/i, 'ITERATE')
        .replace(/\b(store|save|keep|maintain|hold)\b/i, 'STORE')
        .replace(/\b(calculate|compute|determine|find|search)\b/i, 'CALCULATE')
        .replace(/\b(swap|exchange|replace|update|modify)\b/i, 'UPDATE')
        .replace(/\b(merge|combine|join|connect|link)\b/i, 'MERGE')
        .replace(/\b(split|divide|partition|separate)\b/i, 'SPLIT')
        .replace(/\b(sort|arrange|order|organize)\b/i, 'SORT')
        .trim();

      // Add step number
      return `${index + 1}. ${step}`;
    });

  // Generate the complete pseudocode
  const pseudocode = [
    'Algorithm Steps:',
    ...logicalSteps
  ].join('\n');

  return pseudocode;
}

// Helper function to detect specific DSA problem type
function detectProblemType(text: string): string {
  const problemTypes = {
    array: [
      /\b(array|arraylist|vector|dynamic array)\b/i,
      /\b(insert|delete|search|find|sort|reverse)\b.*\b(array|element)\b/i,
      /\b(two pointer|sliding window|subarray|subsequence)\b/i,
    ],
    linkedList: [
      /\b(linked list|singly linked|doubly linked|circular linked)\b/i,
      /\b(node|pointer|next|prev)\b.*\b(linked list)\b/i,
      /\b(insert|delete|reverse|merge|detect cycle)\b.*\b(linked list)\b/i,
    ],
    tree: [
      /\b(tree|binary tree|bst|binary search tree|avl|red black)\b/i,
      /\b(node|root|leaf|parent|child|height|depth)\b.*\b(tree)\b/i,
      /\b(traverse|inorder|preorder|postorder|level order)\b/i,
    ],
    graph: [
      /\b(graph|directed|undirected|weighted|unweighted)\b/i,
      /\b(vertex|edge|adjacency|matrix|list)\b/i,
      /\b(dfs|bfs|dijkstra|kruskal|prim|shortest path)\b/i,
    ],
    sorting: [
      /\b(sort|bubble|quick|merge|insertion|selection|heap)\b.*\b(sort)\b/i,
      /\b(ascending|descending|order|comparison|swap)\b/i,
    ],
    searching: [
      /\b(search|binary search|linear search|find|lookup)\b/i,
      /\b(target|key|element|value)\b.*\b(search)\b/i,
    ],
  };

  for (const [type, patterns] of Object.entries(problemTypes)) {
    if (patterns.some(pattern => pattern.test(text))) {
      return type;
    }
  }
  return '';
}

// Helper function to generate Java code based on problem type
function generateJavaCode(problemType: string, transcript: string): string {
  const codeTemplates = {
    array: `public class ArraySolution {
    // Method to solve array problem
    public static void solve(int[] arr) {
        // Initialize variables
        int n = arr.length;
        
        // Your solution logic here
        for (int i = 0; i < n; i++) {
            // Process array elements
        }
    }
    
    // Main method for testing
    public static void main(String[] args) {
        int[] arr = {1, 2, 3, 4, 5}; // Example array
        solve(arr);
    }
}`,
    linkedList: `public class ListNode {
    int val;
    ListNode next;
    
    ListNode(int val) {
        this.val = val;
        this.next = null;
    }
}

public class LinkedListSolution {
    // Method to solve linked list problem
    public static ListNode solve(ListNode head) {
        // Your solution logic here
        return head;
    }
    
    // Main method for testing
    public static void main(String[] args) {
        // Create example linked list
        ListNode head = new ListNode(1);
        head.next = new ListNode(2);
        head.next.next = new ListNode(3);
        
        solve(head);
    }
}`,
    tree: `public class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;
    
    TreeNode(int val) {
        this.val = val;
        this.left = null;
        this.right = null;
    }
}

public class TreeSolution {
    // Method to solve tree problem
    public static void solve(TreeNode root) {
        // Your solution logic here
    }
    
    // Main method for testing
    public static void main(String[] args) {
        // Create example tree
        TreeNode root = new TreeNode(1);
        root.left = new TreeNode(2);
        root.right = new TreeNode(3);
        
        solve(root);
    }
}`,
    graph: `import java.util.*;

public class GraphSolution {
    // Method to solve graph problem
    public static void solve(int[][] graph) {
        int n = graph.length;
        
        // Your solution logic here
        for (int i = 0; i < n; i++) {
            // Process graph vertices
        }
    }
    
    // Main method for testing
    public static void main(String[] args) {
        // Example adjacency matrix
        int[][] graph = {
            {0, 1, 1},
            {1, 0, 1},
            {1, 1, 0}
        };
        
        solve(graph);
    }
}`,
    sorting: `public class SortingSolution {
    // Method to implement sorting algorithm
    public static void sort(int[] arr) {
        int n = arr.length;
        
        // Your sorting logic here
        for (int i = 0; i < n; i++) {
            // Sorting implementation
        }
    }
    
    // Main method for testing
    public static void main(String[] args) {
        int[] arr = {64, 34, 25, 12, 22, 11, 90};
        sort(arr);
        
        // Print sorted array
        for (int num : arr) {
            System.out.print(num + " ");
        }
    }
}`,
    searching: `public class SearchingSolution {
    // Method to implement searching algorithm
    public static int search(int[] arr, int target) {
        int n = arr.length;
        
        // Your searching logic here
        for (int i = 0; i < n; i++) {
            if (arr[i] == target) {
                return i;
            }
        }
        return -1;
    }
    
    // Main method for testing
    public static void main(String[] args) {
        int[] arr = {1, 2, 3, 4, 5};
        int target = 3;
        
        int result = search(arr, target);
        System.out.println("Element found at index: " + result);
    }
}`
  };

  return codeTemplates[problemType] || '';
}

// Helper function to extract actual code from transcript
function extractActualCode(transcript: string): string {
  // Look for code blocks in the transcript
  const codePatterns = [
    // Match code blocks with language specification
    /```(java|javascript|python|cpp|c\+\+|c#|php|ruby|swift|kotlin)\n([\s\S]*?)```/g,
    // Match code blocks without language specification
    /```\n([\s\S]*?)```/g,
    // Match inline code
    /`([^`]+)`/g,
    // Match code-like patterns
    /\b(public|private|protected|class|interface|enum|void|int|long|float|double|boolean|char|String|Array|List|Map|Set)\b[\s\S]*?\{[\s\S]*?\}/g,
    // Match function/method definitions
    /\b(function|def|public|private|protected)\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\}/g,
  ];

  let extractedCode = '';

  for (const pattern of codePatterns) {
    const matches = transcript.match(pattern);
    if (matches) {
      // Clean and format the code
      const code = matches.map(match => {
        // Remove language specifiers and backticks
        return match.replace(/```(?:java|javascript|python|cpp|c\+\+|c#|php|ruby|swift|kotlin)?\n?/, '')
                   .replace(/```/g, '')
                   .replace(/`/g, '')
                   .trim();
      }).join('\n\n');

      if (code) {
        extractedCode = code;
        break; // Use the first pattern that finds code
      }
    }
  }

  return extractedCode;
}

// Helper function to decode HTML entities
function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// Helper function to generate summary from transcript
function generateSummary(transcript: string): string {
  // Split transcript into sentences
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Group sentences into paragraphs based on content
  const paragraphs: string[] = [];
  let currentParagraph: string[] = [];
  let currentTopic = '';
  
  sentences.forEach((sentence, index) => {
    sentence = sentence.trim();
    if (sentence.length > 0) {
      // Extract main topic from sentence
      const words = sentence.toLowerCase().split(/\s+/);
      const topic = words.slice(0, 3).join(' ');
      
      // Start new paragraph if topic changes or after 3-4 sentences
      if (currentTopic && topic !== currentTopic && currentParagraph.length >= 3) {
        paragraphs.push(currentParagraph.join('. ') + '.');
        currentParagraph = [];
      }
      
      currentParagraph.push(sentence);
      currentTopic = topic;
      
      // Force new paragraph after 4 sentences
      if (currentParagraph.length >= 4) {
        paragraphs.push(currentParagraph.join('. ') + '.');
        currentParagraph = [];
        currentTopic = '';
      }
    }
  });
  
  // Add any remaining sentences as the last paragraph
  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph.join('. ') + '.');
  }
  
  // Ensure we have at least 2 paragraphs
  if (paragraphs.length === 0) {
    return `**${sentences.slice(0, 4)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .join('. ') + '.'}**`;
  }
  
  // If we have only one paragraph, split it into two
  if (paragraphs.length === 1) {
    const sentences = paragraphs[0].split('. ');
    const midPoint = Math.floor(sentences.length / 2);
    return `**${[
      sentences.slice(0, midPoint).join('. ') + '.',
      sentences.slice(midPoint).join('. ') + '.'
    ].join('\n\n')}**`;
  }
  
  // Return all paragraphs with proper spacing and bold formatting
  return `**${paragraphs.join('\n\n')}**`;
}

// Helper function to extract GitHub file URL from description
async function extractGitHubFileUrl(description: string): Promise<{ url: string; fileType: string } | null> {
  try {
    // Look for code solution mentions with nearby GitHub links
    const solutionPatterns = [
      /(?:my solution|code solution|solution:?\s*)(https?:\/\/github\.com\/[^\s]+)/i,
      /(https?:\/\/github\.com\/[^\s]+)(?:\s*-\s*(?:my )?solution)/i,
      /solution.*?(https?:\/\/github\.com\/[^\s]+)/i,
      /(https?:\/\/github\.com\/[^\s]+)/i
    ];

    let githubUrl = null;
    for (const pattern of solutionPatterns) {
      const match = description.match(pattern);
      if (match) {
        githubUrl = match[1];
        break;
      }
    }

    if (!githubUrl) {
      console.log('No GitHub URL found in description');
      return null;
    }

    // If URL is a repository, try to find the solution file
    if (!githubUrl.includes('/blob/')) {
      try {
        // Convert repository URL to API URL
        const apiUrl = githubUrl
          .replace('github.com', 'api.github.com/repos')
          .replace(/\/$/, '');
        
        // Fetch repository contents
        const response = await fetch(`${apiUrl}/contents`, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'YouTube-Analysis-App'
          }
        });

        if (response.ok) {
          const contents = await response.json();
          // Look for solution files
          const solutionFile = contents.find((file: any) => {
            const fileName = file.name.toLowerCase();
            const isSolutionFile = fileName.includes('solution') || 
                                 fileName.includes('solve') ||
                                 /\.(java|py|js|cpp|c|cs)$/.test(fileName);
            return isSolutionFile;
          });

          if (solutionFile) {
            githubUrl = solutionFile.html_url;
          }
        }
      } catch (error) {
        console.error('Error fetching repository contents:', error);
      }
    }

    // Clean up the URL
    githubUrl = githubUrl.replace(/\?.*$/, ''); // Remove query parameters
    const fileType = githubUrl.split('.').pop()?.toLowerCase() || '';

    console.log('Found GitHub URL:', { url: githubUrl, fileType });
    return { url: githubUrl, fileType };

  } catch (error) {
    console.error('Error extracting GitHub URL:', error);
    return null;
  }
}

// Helper function to convert GitHub blob URL to raw content URL
function convertToRawGitHubUrl(url: string): string {
  try {
    // Handle different GitHub URL formats
    if (url.includes('github.com') && url.includes('/blob/')) {
      // Convert blob URL to raw URL
      return url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }
    return url;
  } catch (error) {
    console.error('Error converting GitHub URL:', error);
    return url;
  }
}

// Helper function to fetch code from GitHub
async function fetchGitHubCode(urlInfo: { url: string; fileType: string }): Promise<{ code: string | null; fileType: string }> {
  try {
    const rawUrl = convertToRawGitHubUrl(urlInfo.url);
    console.log('Fetching code from:', rawUrl);

    const response = await fetch(rawUrl, {
      headers: {
        'Accept': 'text/plain, application/vnd.github.v3.raw',
        'User-Agent': 'YouTube-Analysis-App'
      }
    });
    
    if (!response.ok) {
      console.error('Failed to fetch code:', {
        status: response.status,
        statusText: response.statusText,
        url: rawUrl
      });
      return { code: null, fileType: urlInfo.fileType };
    }

    const code = await response.text();
    if (!code || code.trim().length === 0) {
      console.error('Empty code content received');
      return { code: null, fileType: urlInfo.fileType };
    }

    return { code, fileType: urlInfo.fileType };
  } catch (error) {
    console.error('Error fetching code:', error);
    return { code: null, fileType: urlInfo.fileType };
  }
}

// Update the analyzeVideoSubtitles function
export const analyzeVideoSubtitles = async (videoId: string) => {
  try {
    // Get video subtitles first
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const fullText = transcript.map(item => decodeHTMLEntities(item.text)).join(' ');

    // Get video details
    const videoResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`
    );

    if (!videoResponse.ok) {
      const errorData = await videoResponse.json();
      throw new Error(`YouTube API error: ${errorData.error?.message || 'Failed to fetch video details'}`);
    }

    const videoData = await videoResponse.json();
    const video = videoData.items?.[0];
    
    if (!video) {
      throw new Error('Video not found in API response');
    }

    // Extract keywords from title and transcript
    const keywords = extractKeywords(`${video.snippet?.title} ${fullText}`);

    // Calculate engagement metrics
    const viewCount = parseInt(video.statistics?.viewCount || '0');
    const likeCount = parseInt(video.statistics?.likeCount || '0');
    const commentCount = parseInt(video.statistics?.commentCount || '0');
    
    const engagementRate = viewCount > 0 
      ? ((likeCount / viewCount) * 100).toFixed(2) 
      : '0';
    
    const commentRate = viewCount > 0 
      ? ((commentCount / viewCount) * 100).toFixed(2) 
      : '0';

    // Generate short notes and code snippets from transcript
    const { points, codeSnippets } = generateShortNotes(fullText);

    // Extract actual code from transcript
    const actualCode = extractActualCode(fullText);
    const problemType = detectProblemType(fullText);

    // Check for GitHub code in description
    const description = video.snippet?.description || '';
    console.log('Checking description for GitHub URLs:', description);
    
    const githubUrlInfo = await extractGitHubFileUrl(description);
    console.log('Found GitHub URL info:', githubUrlInfo);
    
    let githubCode = null;
    let githubFileType = '';
    let githubUrl = '';

    if (githubUrlInfo) {
      const { code, fileType } = await fetchGitHubCode(githubUrlInfo);
      githubCode = code;
      githubFileType = fileType;
      githubUrl = githubUrlInfo.url;
      console.log('GitHub code fetched:', code ? 'Successfully' : 'Failed', 'File type:', fileType);
    }

    // Generate content analysis
    const contentAnalysis = [
      'Performance Analysis:',
      `This video has ${video.statistics?.viewCount || '0'} views, ${video.statistics?.likeCount || '0'} likes, and ${video.statistics?.commentCount || '0'} comments. The engagement rate is ${engagementRate}% (likes per view) and comment rate is ${commentRate}% (comments per view).`,
      '',
      'Content Analysis:',
      `- Main Topic: ${video.snippet?.title}`,
      `- Content Type: ${video.snippet?.tags?.join(', ') || 'Not specified'}`,
      `- Key Keywords: ${keywords.join(', ')}`,
      `- Video Length: ${estimateDuration(fullText)}`,
      '',
      actualCode ? [
        'Code from Video:',
        '```java',
        actualCode,
        '```',
        ''
      ].join('\n') : '',
      codeSnippets.length > 0 ? [
        'Code Snippets:',
        ...codeSnippets.map((code, index) => [
          `\nSnippet ${index + 1}:`,
          '```',
          code,
          '```'
        ].join('\n'))
      ].join('\n') : ''
    ].filter(Boolean).join('\n');

    // Generate summary separately
    const transcriptSummary = generateSummary(fullText);

    // Prepare the complete analysis
    const analysis = {
      title: video.snippet?.title || '',
      description: video.snippet?.description || '',
      publishedAt: video.snippet?.publishedAt || '',
      viewCount: video.statistics?.viewCount || '0',
      likeCount: video.statistics?.likeCount || '0',
      commentCount: video.statistics?.commentCount || '0',
      transcript: fullText,
      contentAnalysis,
      shortNotes: points,
      codeSnippets,
      actualCode,
      problemType,
      summary: transcriptSummary,
      githubCode,
      githubUrl,
      githubFileType
    };

    return analysis;
  } catch (error) {
    return {
      title: 'Video Analysis',
      description: 'Unable to fetch video details',
      publishedAt: new Date().toISOString(),
      viewCount: '0',
      likeCount: '0',
      commentCount: '0',
      transcript: 'Transcript not available',
      contentAnalysis: `Error analyzing video: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your YouTube API key and try again.`,
      shortNotes: [],
      codeSnippets: [],
      actualCode: '',
      problemType: '',
      summary: 'Unable to analyze video content. Please try again later.',
      githubCode: null,
      githubUrl: null,
      githubFileType: null
    };
  }
};

export const fetchVideo = async (id: string) => {
  const { data, error } = await supabase
    .from('yt_videos')
    .select('*')
    .eq('id', id)
    .limit(1);

  if (error) {
    throw error;
  }
  if (!data || data.length === 0) {
    throw new Error('Video not found');
  }
  return data[0];
};