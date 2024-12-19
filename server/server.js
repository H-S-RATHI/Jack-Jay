// Import required modules
const fs = require('fs');
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
    appKey: '58KTa3Jx9WuGUy28sm9Epf5Dr',
    appSecret: 'sUbumqFnJt35sLTjC8TJeqeqDHKAaHu2Jj31aTPum651URKGFe',
    accessToken: '1865283887196176384-jrJLTqHQWm5geJH1iCuvir7I29ZsmP',
    accessSecret: '7ozadivccYI85xA6lR2yARkWmH6jVRVPQ9m6GHsSiXggr',
});

// Endpoint to fetch tweets after a given date
app.get('/fetch-tweets', async (req, res) => {
    const { lastDate, username } = req.query;

    if (!lastDate || !username) {
        return res.status(400).json({ message: 'Missing required parameters: lastDate or username' });
    }

    const lastDateTime = new Date(lastDate);
    if (isNaN(lastDateTime)) {
        return res.status(400).json({ message: 'Invalid date format' });
    }

    try {
        const userResponse = await client.v2.userByUsername(username);
        const userId = userResponse.data?.id;

        if (!userId) {
            return res.status(400).json({ message: `Invalid username: ${username}` });
        }

        let allTweets = [];
        let nextToken = null;

        do {
            const params = {
                max_results: 100, // Fetch up to 100 tweets per API call
                pagination_token: nextToken,
            };

            const timelineResponse = await client.v2.userTimeline(userId, params);
            const tweets = timelineResponse.data?.data || [];
            nextToken = timelineResponse.meta?.next_token;

            // Filter tweets posted after the given date
            const newTweets = tweets.filter((tweet) => {
                const tweetDate = new Date(tweet.created_at);
                return tweetDate > lastDateTime;
            });

            allTweets = [...allTweets, ...newTweets];

            // Stop fetching if the oldest tweet in this batch is older than `lastDate`
            if (tweets.some((tweet) => new Date(tweet.created_at) <= lastDateTime)) {
                break;
            }
        } while (nextToken); // Continue fetching until no more pages or early termination

        // Format tweets for the response
        const formattedTweets = allTweets.map((tweet) => ({
            TweetText: tweet.text,
            Type: tweet.referenced_tweets?.[0]?.type || 'tweet',
            CreatedAt: tweet.created_at,
            Media: tweet.attachments?.media_keys ? 'photo/video' : 'none',
        }));

        res.json({ message: 'Tweets fetched successfully', tweets: formattedTweets });
    } catch (error) {
        console.error('Error fetching tweets:', error);
        res.status(500).json({ message: 'Error fetching tweets', error: error.message });
    }
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

        // Check for rate limiting error
        if (error.code === 429) {
            res.status(429).json({ message: 'Error posting tweet', error: 'Too Many Requests' });
        } else {
            res.status(500).json({ message: 'Error posting tweet', error: error.message });
        }
    }
});

// Route to update API credentials
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

// Start the server
const PORT = process.env.PORT || 3000; // Use the port from environment variables or default to 3000
app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});



