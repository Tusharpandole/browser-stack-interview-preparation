// Import the Node.js 'fs' module for file system operations (synchronous and callback-based).
// Search query: "Node.js fs module file operations"
const fs = require('fs');

// Import the 'fs.promises' module for Promise-based file system operations.
// Search query: "Node.js fs.promises async file operations"
const fsPromises = require('fs').promises;

// Define the path to the log file to monitor ('test.txt' in the same directory).
// Search query: "Node.js file path conventions"
const filePath = './test.txt';

// Initialize an array to store the last 10 lines of the log file.
// Search query: "Node.js array store last n elements"
let last_10 = [];

// Initialize an object to store active SSE client responses, keyed by request ID.
// Search query: "Node.js store SSE client connections"
let pool = {};

// Initialize an array to store request IDs of active SSE clients.
// Search query: "Node.js track client connections array"
let reqIds = [];

// **Imports fs and fs.promises for file operations.
// Defines filePath as test.txt, the log file to monitor.
// Initializes last_10 (array for last 10 lines), pool (object for client responses), and reqIds (array for client IDs).**

// Define an async function to read the last 10 lines from the log file.
// Search query: "Node.js read last n lines of file"
async function getLast10Lines() {
    // Use a try-catch block to handle potential file access errors.
    // Search query: "Node.js try-catch async await"
    try {
        // Get file metadata (e.g., size) using Promise-based stat.
        // Search query: "Node.js fs.promises.stat file size"
        const stats = await fsPromises.stat(filePath);
        // Create a read stream starting from the last ~1000 bytes to optimize for large files.
        // Search query: "Node.js fs.createReadStream read last bytes"
        const stream = fs.createReadStream(filePath, {
            // Ensure start is not negative; read last 1000 bytes (adjustable for larger files).
            // Search query: "Node.js read stream start position"
            start: Math.max(0, stats.size - 1000),
            // Set encoding to 'utf8' to read as text.
            // Search query: "Node.js read stream encoding utf8"
            encoding: 'utf8'
        });
        // Initialize a string to accumulate file data.
        // Search query: "Node.js accumulate stream data"
        let data = '';
        // Iterate over stream chunks asynchronously to build the data string.
        // Search query: "Node.js async iterator read stream"
        for await (const chunk of stream) {
            // Append each chunk to the data string.
            // Search query: "Node.js append stream chunk to string"
            data += chunk;
        }
        // Split data into lines, filter out empty lines, and take the last 10.
        // Search query: "Node.js split string into lines filter empty"
        const lines = data.split('\n').filter(line => line.trim() !== '').slice(-10);
        // Store the last 10 lines in the global last_10 array.
        // Search query: "Node.js update global array"
        last_10 = lines;
    // Catch any errors (e.g., file not found) and log them.
    } catch (err) {
        // Log the error for debugging.
        // Search query: "Node.js handle file not found error"
        console.error('Error reading last 10 lines:', err);
        // Reset last_10 to empty array to avoid breaking the app.
        // Corner case: If the file is empty or doesn’t exist, last_10 is set to empty.
        last_10 = [];
    }
}

// **Reading Last 10 Lines (getLast10Lines):
// Uses fsPromises.stat to get the file size.
// Creates a read stream starting from the last ~1000 bytes to optimize for large files (avoids reading the entire file).
// Accumulates data, splits it into lines, filters out empty lines, and takes the last 10 to store in last_10.
// Handles errors (e.g., file not found) by setting last_10 to an empty array.**

// Define a function to send an SSE message to a client.
// Search query: "Node.js SSE format message"
function emitSSE(res, data) {
    // Write the data in SSE format (data: <message>\n\n).
    // Search query: "SSE data format specification"
    res.write(`data: ${data}\n\n`);
}

// Define a function to send the last 10 lines to a client.
// Search query: "Node.js send multiple SSE messages"
function emitLastLines(res) {
    // Iterate over last_10 array and send each line as an SSE event.
    // Search query: "Node.js iterate array send SSE"
    last_10.forEach(line => emitSSE(res, line));
}

// **SSE Formatting (emitSSE and emitLastLines):
// emitSSE formats data in SSE format (data: <message>\n\n) and sends it to a client.
// emitLastLines sends all lines in last_10 to a client on initial connection.**

// Define an async function to monitor the log file for changes.
// Search query: "Node.js fs.watchFile monitor file changes"
async function watchFile() {
    // Use a try-catch block to handle file watching errors.
    // Search query: "Node.js handle fs.watchFile errors"
    try {
        // Initialize last_10 by reading the last 10 lines of the file.
        // Search query: "Node.js call async function on startup"
        await getLast10Lines();

        // Watch the file for changes, polling every 100ms.
        // Search query: "Node.js fs.watchFile polling interval"
        fs.watchFile(filePath, { interval: 100 }, async (curr, prev) => {
            // Skip if file size hasn’t increased (e.g., no new data or file truncated).
            // Corner case: If the file shrinks, updates are skipped (curr.size <= prev.size).
            // Search query: "Node.js fs.watchFile handle file shrink"
            if (curr.size <= prev.size) return;
            // Create a read stream to read only new data (from prev.size to curr.size).
            // Search query: "Node.js read new data from file stream"
            const stream = fs.createReadStream(filePath, {
                // Start reading from the previous file size.
                // Search query: "Node.js read stream start end position"
                start: prev.size,
                // Read up to the current file size.
                end: curr.size,
                // Set encoding to 'utf8' for text.
                // Search query: "Node.js read stream encoding utf8"
                encoding: 'utf8'
            });
            // Initialize a string to accumulate new data.
            // Search query: "Node.js accumulate stream data"
            let newData = '';
            // Iterate over stream chunks to build new data.
            // Search query: "Node.js async iterator read stream"
            for await (const chunk of stream) {
                // Append each chunk to newData.
                // Search query: "Node.js append stream chunk to string"
                newData += chunk;
            }
            // Split new data into lines, filtering out empty lines.
            // Corner case: Empty lines are filtered out to ensure clean output.
            // Search query: "Node.js filter empty lines from string"
            const newLines = newData.split('\n').filter(line => line.trim() !== '');
            // Add new lines to last_10 array.
            // Search query: "Node.js push to array"
            last_10.push(...newLines);
            // Keep only the last 10 lines if the array exceeds 10.
            // Search query: "Node.js keep last n elements in array"
            if (last_10.length > 10) {
                last_10 = last_10.slice(-10);
            }
            // Send each new line to all connected clients.
            // Search query: "Node.js broadcast SSE to all clients"
            newLines.forEach(line => {
                // Iterate over all client IDs and send the line via SSE.
                // Search query: "Node.js iterate array send SSE"
                reqIds.forEach(id => emitSSE(pool[id], line));
            });
        });
    // Catch any errors during file watching and log them.
    } catch (err) {
        // Search query: "Node.js handle file watching errors"
        console.error('Error watching file:', err);
    }
}

// **File Monitoring (watchFile):
// Calls getLast10Lines to initialize last_10.
// Uses fs.watchFile to poll test.txt every 100ms for changes.
// When the file grows (curr.size > prev.size), reads only new data using a stream (start: prev.size, end: curr.size).
// Splits new data into lines, updates last_10 (keeping only the last 10), and sends new lines to all clients via emitSSE.**

// Define the SSE handler for /log endpoint.
// Search query: "Node.js SSE server implementation"
const handleSSE = (req, res) => {
    // Handle client disconnection to clean up resources.
    // Search query: "Node.js handle client disconnect SSE"
    req.on('close', () => {
        // Log disconnection with the client’s ID.
        // Search query: "Node.js log client disconnection"
        console.log('SSE client disconnected:', req.id);
        // Remove the client’s ID from reqIds array.
        // Search query: "Node.js remove element from array"
        reqIds = reqIds.filter(id => id !== req.id);
        // Remove the client’s response object from pool.
        // Search query: "Node.js delete object property"
        delete pool[req.id];
        // End the response to close the connection.
        // Search query: "Node.js res.end close connection"
        res.end();
    });

    // Log new client connection for debugging.
    // Search query: "Node.js log client connection"
    console.log('New /log request');
    // Set HTTP headers for SSE.
    // Search query: "SSE HTTP headers Node.js"
    res.writeHead(200, {
        // Set content type to text/event-stream for SSE.
        // Search query: "SSE content-type text/event-stream"
        'Content-Type': 'text/event-stream',
        // Disable caching to ensure real-time updates.
        // Search query: "Node.js disable cache HTTP headers"
        'Cache-Control': 'no-cache',
        // Keep the connection open for continuous updates.
        // Search query: "Node.js keep-alive connection"
        'Connection': 'keep-alive'
    });

    // Send the last 10 lines to the new client.
    // Search query: "Node.js send initial SSE data"
    emitLastLines(res);
    // Assign a unique ID to the request using the current timestamp.
    // Search query: "Node.js generate unique ID"
    req.id = Date.now();
    // Add the client’s ID to reqIds array.
    // Search query: "Node.js push to array"
    reqIds.push(req.id);
    // Store the response object in pool for sending updates.
    // Search query: "Node.js store response object SSE"
    pool[req.id] = res;
    // Log the total number of connected clients.
    // Search query: "Node.js log number of clients"
    console.log('Total clients:', reqIds.length);
};

// **SSE Handler (handleSSE):
// Sets up an SSE connection with appropriate headers (text/event-stream, no-cache, keep-alive).
// Sends the last 10 lines to the new client.
// Assigns a unique ID to the client, stores it in reqIds, and saves the response object in pool.
// Handles client disconnection by removing the client’s ID and response from reqIds and pool.
// Logs connection and disconnection events for debugging.**

// Start watching the file immediately when the module is loaded.
// Search query: "Node.js start function on module load"
watchFile();

// Export the handleSSE function for use in server.js.
// Search query: "Node.js module exports"
module.exports = { handleSSE };

// **Corner Cases:
// “If the file is empty or doesn’t exist, last_10 is set to empty.”
// “If the file shrinks, updates are skipped (curr.size <= prev.size).”
// “Empty lines are filtered out to ensure clean output.”**