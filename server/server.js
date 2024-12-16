// Import required modules
const express = require('express');
const cors = require('cors');
const { TwitterApi } = require('twitter-api-v2');

// Initialize Express app
const app = express();

// Middleware
app.use(express.json()); // Parse JSON bodies
app.use(cors()); // Enable Cross-Origin Resource Sharing

// Initialize variables for Twitter API credentials
let client = new TwitterApi({
    appKey: 'FqCQr3e00hkKaR3SFo1uYEYR3',
    appSecret: 'LKy1FeXKjMnha07Z7GwmXelDC9gfLFIzvDnIkunN1B74qjxYvE',
    accessToken: '1865283887196176384-rQeYMf4peUiZcamgr4u7qI6EpCkEiY',
    accessSecret: 'J5CXQJZk1RwAmYmBKLkNKMGpWxJQbn5qcTo1DVgoGjZXK',
});


// Root route
app.get('/c', (req, res) => {
    res.send('Welcome to the Twitter Backend API! Use /tweet to post tweets or /update-keys to update credentials.');
});

// POST route to handle tweets
app.post('/tweet', async (req, res) => {
    const { tweetContent } = req.body; // Extract tweet content from request body

    try {
        // Post the tweet using Twitter API
        const tweetResponse = await client.v2.tweet(tweetContent);
        res.json({
            message: 'Tweet posted successfully!',
            data: tweetResponse,
        });
    } catch (error) {
        console.error('Error posting tweet:', error);
        res.status(500).json({ message: 'Error posting tweet', error: error.message });
    }
});




app.post('/', (req, res) => {
    const { appKey, appSecret, accessToken, accessSecret } = req.body;

    if (!appKey || !appSecret || !accessToken || !accessSecret) {
        return res.status(400).json({ message: 'All fields (appKey, appSecret, accessToken, accessSecret) are required.' });
    }

    
    try {
      // Properly initialize the client with Twitter API credentials
      client = new TwitterApi({
          appKey: appKey,       // Application key
          appSecret: appSecret, // Application secret
          accessToken: accessToken,   // Access token
          accessSecret: accessSecret, // Access secret
      });
        console.log('Updated Twitter API credentials:', {
          appKey,
          appSecret,
          accessToken,
          accessSecret,
      });
        res.json({ message: 'API credentials updated successfully!' });
    } catch (error) {
        console.error('Error updating API credentials:', error);
        res.status(500).json({ message: 'Error updating API credentials', error: error.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

