import { deleteVideoRecords } from '../lib/cleanup';

async function main() {
    try {
        console.log('Starting cleanup process...');
        const deletedCount = await deleteVideoRecords(500);
        console.log(`Cleanup completed. Deleted ${deletedCount} records.`);
    } catch (error) {
        console.error('Cleanup failed:', error);
        process.exit(1);
    }
}

main(); 