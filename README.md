# Chess Online
This is a simple online chess platform implemented with the MEAN stack. I will continuously update this document as I make more progress.
 
## Progress so far
 * Basic user authentication (HTTP) via the Passport package.
 * Basic user authentication (Sockets.io) via the Passport package.
 * Simple mapping of {user.id => socket}.
 * Set up core routing functionality for both angular.js and node.js
 * Implemented UI's for logging in and signing up.
 * Partially implemented skeleton for the actual application.
 * Started implementing friend management API

### Notes
 * The User model is not currently validated at all - on neither the client side or the server side. I will tend to this once I've got a simple prototype working. For now I will maintain a list of bugs caused by this lack of validation (so I can remember to test them later):
     * Spaces in usernames cause the angular-router to misinterpret the username (there are not meant to be spaces in URLs...)
 * Currently, session is being stored via express-session's default session store. I intend to configure a persistent memory store (most likely Redis), mainly for scalability and robustness.
 * The way sockets are currently managed is very messy - it definitely needs a rethink. I'm going to move the socket.io initialization code from the main server module, and into it's own module.