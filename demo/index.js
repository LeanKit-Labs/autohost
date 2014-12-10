var host = require( '../src/index.js' );
var authProvider = require( 'autohost-nedb-auth' )( {} );

var redis = require( 'redis' ).createClient(); // assumes a locally running redis server
var RedisStore = require( 'connect-redis' )( host.session );
var store = new RedisStore( {
		client: redis,
		prefix: 'ah:'
	} );

try {
	host.init( {
		port: 4041,
		resources: './demo/resource',
		static: './demo/public',
		socketIO: true,
		websockets: true,
		origin: 'console',
		anonymous: [ '/$', '/js', '/css' ],
		sessionId: 'myapp.sid',
		sessionSecret: 'youdontevenknow',
		sessionStore: store,
	},
	authProvider );
	
	
	// }, require( 'autohost-nedb-auth' )( {} ) );
	// }, require( 'autohost-riak-auth' )(
	// 	{ appName: 'ahdemo', 
	// 		riak: { nodes: [
	// 			{ host: 'ubuntu' }
	// 		] }
	// 	} ) );
} catch( e ) { console.log( e.stack ); }