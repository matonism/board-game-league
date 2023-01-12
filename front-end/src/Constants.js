const Constants = {
    MOCK_STORAGE: false,
    MOCK_API: false, 
    // MOCK_STORAGE: true,
    // MOCK_API: true, 
    // SERVER_URL: "http://localhost:4001",
    HOST_URL: "http://localhost:3000",
    SERVER_URL:  'https://6k70mthaui.execute-api.us-east-2.amazonaws.com',
    // HOST_URL: "https://brackset.com",
    // HOST_URL: "http://bracket-generator.s3-website.us-east-2.amazonaws.com",

    COOKIE_USER_KEY: 'user',
    COOKIE_USERNAME_KEY: 'username',
    COOKIE_USER_EMAIL_KEY: 'email',
    COOKIE_HOURS_EXPIRATION: 5,

    SCREEN_HOME: "Home",
    SCREEN_USER_PROFILE: "User Profile",
    SCREEN_POLL_SUMMARY: "Poll Summary",
    POLL_DISPLAY_ACTIVE: "Open Poll",
    SCREEN_OPEN_POLL: "Open Poll",
    SCREEN_POLL_RESULTS: "Poll Complete",
    RECENT_POLL_COOKIE_PREFIX: "recent-poll-",
    LOCAL_SUBMISSION_EXPIRATION: 24 * 14 //two weeks 
}

export default Constants;