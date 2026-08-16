// Entry point wrapper untuk cPanel "Setup Node.js App" (Phusion Passenger)
// Memungkinkan cPanel mengenali baik 'app.js' maupun 'dist/server.cjs' sebagai Application Startup File.
require('./dist/server.cjs');
