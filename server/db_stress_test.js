import db from './db/database.js';

async function runTests() {
  console.log('--- STARTING DATABASE CONSTRAINT STRESS-TESTS ---');
  let exitCode = 0;

  // Cleanup helper in case of aborted runs
  const cleanup = () => {
    console.log('Cleaning up any leftover test data...');
    try {
      db.prepare("DELETE FROM channels WHERE youtube_channel_id IN ('test_channel_12345', 'test_channel_cascade')").run();
      console.log('Cleanup complete.');
    } catch (err) {
      console.error('Error during cleanup:', err.message);
    }
  };

  try {
    // Run initial cleanup
    cleanup();

    // 1. UNIQUE CONSTRAINT TEST
    console.log('\n[TEST 1] Testing unique constraint on channels...');
    try {
      // First insert
      db.prepare("INSERT INTO channels (youtube_channel_id, name) VALUES ('test_channel_12345', 'Test Channel')").run();
      console.log('First insert succeeded.');

      // Second duplicate insert
      db.prepare("INSERT INTO channels (youtube_channel_id, name) VALUES ('test_channel_12345', 'Duplicate Test Channel')").run();
      console.error('FAIL: Duplicate insert succeeded, but should have failed!');
      exitCode = 1;
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        console.log('PASS: Duplicate insert failed with expected unique constraint error:', error.message);
      } else {
        console.error('FAIL: Duplicate insert failed with unexpected error:', error.message);
        exitCode = 1;
      }
    }

    // 2. FOREIGN KEY CONSTRAINT TEST
    console.log('\n[TEST 2] Testing foreign key constraint on channel_stats...');
    try {
      const nonExistentChannelId = 999999;
      db.prepare(`
        INSERT INTO channel_stats (channel_id, date, subscribers, total_views, video_count)
        VALUES (${nonExistentChannelId}, '2026-06-17', 100, 1000, 5)
      `).run();
      console.error('FAIL: Insert with non-existent channel_id succeeded, but should have failed!');
      exitCode = 1;
    } catch (error) {
      if (error.message.includes('FOREIGN KEY constraint failed')) {
        console.log('PASS: Insert failed with expected foreign key constraint error:', error.message);
      } else {
        console.error('FAIL: Insert failed with unexpected error:', error.message);
        exitCode = 1;
      }
    }

    // 3. CASCADING DELETES TEST
    console.log('\n[TEST 3] Testing cascading deletes on channels -> channel_stats...');
    try {
      // Insert new channel
      const channelResult = db.prepare("INSERT INTO channels (youtube_channel_id, name) VALUES ('test_channel_cascade', 'Cascade Channel')").run();
      const channelId = channelResult.lastInsertRowid;
      console.log(`Channel inserted with ID: ${channelId}`);

      // Insert stats referencing the new channel
      const statsResult = db.prepare(`
        INSERT INTO channel_stats (channel_id, date, subscribers, total_views, video_count)
        VALUES (${channelId}, '2026-06-17', 500, 5000, 12)
      `).run();
      console.log(`Stats inserted for channel ID: ${channelId}`);

      // Verify stats exist
      const beforeDeleteCount = db.prepare(`SELECT COUNT(*) as count FROM channel_stats WHERE channel_id = ${channelId}`).get().count;
      console.log(`Stats count before delete: ${beforeDeleteCount}`);
      if (beforeDeleteCount !== 1) {
        throw new Error(`Expected 1 stats row, found ${beforeDeleteCount}`);
      }

      // Delete the channel
      console.log(`Deleting channel ID: ${channelId}...`);
      db.prepare(`DELETE FROM channels WHERE id = ${channelId}`).run();

      // Verify channel is deleted
      const channelCountAfter = db.prepare(`SELECT COUNT(*) as count FROM channels WHERE id = ${channelId}`).get().count;
      console.log(`Channel count after delete: ${channelCountAfter}`);
      if (channelCountAfter !== 0) {
        throw new Error(`Channel was not deleted`);
      }

      // Verify stats are automatically deleted (cascade)
      const afterDeleteCount = db.prepare(`SELECT COUNT(*) as count FROM channel_stats WHERE channel_id = ${channelId}`).get().count;
      console.log(`Stats count after delete: ${afterDeleteCount}`);
      if (afterDeleteCount === 0) {
        console.log('PASS: Cascading delete worked. Stats were automatically deleted.');
      } else {
        console.error(`FAIL: Cascading delete failed. ${afterDeleteCount} stats rows still remain!`);
        exitCode = 1;
      }
    } catch (error) {
      console.error('FAIL: Cascading delete test crashed with error:', error.message);
      exitCode = 1;
    }

  } finally {
    // Clean up
    console.log('');
    cleanup();
  }

  if (exitCode === 0) {
    console.log('\n--- ALL DATABASE CONSTRAINT TESTS PASSED ---');
  } else {
    console.error('\n--- SOME DATABASE CONSTRAINT TESTS FAILED ---');
  }
  process.exit(exitCode);
}

runTests();
