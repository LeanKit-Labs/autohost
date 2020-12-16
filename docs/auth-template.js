/* eslint-disable no-magic-numbers */
"use strict";

const crypt = require( "bcrypt" );
const when = require( "when" );
const Basic = require( "passport-http" ).BasicStrategy;
const Bearer = require( "passport-http-bearer" ).Strategy;
const _ = require( "lodash" );
const actions = require( "./actions.js" ); // storage abstraction for actions
const roles = require( "./roles.js" ); // storage abstraction for roles
const users = require( "./users.js" ); // storage abstraction for users

let	basicAuth,
	bearerAuth,
	useSession;

const wrapper = {
	authenticate,
	changeActionRoles: actions.changeRoles,
	changePassword,
	changeUserRoles: users.changeRoles,
	checkPermission,
	createRole: roles.create,
	createUser,
	createToken: users.createToken,
	deleteAction: actions.delete,
	deleteRole: roles.delete,
	deleteUser: users.delete,
	destroyToken: users.destroyToken,
	deserializeUser,
	disableUser: users.disable,
	enableUser: users.enable,
	getActions: actions.getList,
	getActionRoles: actions.getRoles,
	getRoles: roles.getList,
	getTokens: users.getTokens,
	getUsers: users.getList,
	getUserRoles: users.getRoles,
	hasUsers: users.hasUsers,
	initPassport( passport ) {
		basicAuth = passport.authenticate( "basic", { session: useSession } );
		bearerAuth = passport.authenticate( "bearer", { session: useSession } );
	},
	serializeUser,
	strategies: [
		new Basic( authenticateCredentials ),
		new Bearer( authenticateToken )
	],
	updateActions,
	verifyCredentials
};

function authenticate( req, res, next ) {
	const authorization = req.headers.authorization;
	if ( /Bearer/i.test( authorization ) ) {
		bearerAuth( req, res, next );
	} else {
		basicAuth( req, res, next );
	}
}

function authenticateCredentials( userName, password, done ) {
	verifyCredentials( userName, password )
		.then( function( result ) {
			done( null, result );
		} );
}

function authenticateToken( token, done ) {
	return users
		.getByToken( token )
		.then( null, function( err ) {
			done( err );
		} )
		.then( function( user ) {
			done( null, user || false );
		} );
}

function changePassword( username, password ) {
	const salt = crypt.genSaltSync( 10 );
	const hash = crypt.hashSync( password, salt );
	return users.changePassword( username, salt, hash );
}

function createUser( username, password ) {
	const salt = crypt.genSaltSync( 10 );
	const hash = crypt.hashSync( password, salt );
	return users.create( username, salt, hash );
}

function checkPermission( user, action ) {
	const actionName = action.roles ? action.name : action;
	const	actionRoles = _.isEmpty( action.roles ) ? actions.getRoles( actionName ) : action.roles;
	let	userRoles = _.isEmpty( user.roles ) ? users.getRoles( user ) : user.roles;
	if ( user.roles && user.disabled ) {
		userRoles = [];
	}
	return when.try( userCan, userRoles, actionRoles );
}

function deserializeUser( user, done ) { done( null, user ); }

function serializeUser( user, done ) { done( null, user ); }

function updateActions( actionList ) {
	const list = _.flatten(
		_.map( actionList, function( resource, resourceName ) {
			return _.map( resource, function( action ) {
				return actions.create( action, resourceName );
			} );
		} ) );
	return when.all( list );
}

function userCan( userRoles, actionRoles ) {
	return actionRoles.length === 0 || _.intersection( actionRoles, userRoles ).length > 0;
}

function verifyCredentials( username, password ) {
	return users
		.getByName( username )
		.then( function( user ) {
			if ( user ) {
				const valid = user.hash === crypt.hashSync( password, user.salt );
				return valid ? _.omit( user, "hash", "salt", "tokens" ) : false;
			}
			return false;
		} );
}

module.exports = function( config ) {
	useSession = !( config === undefined ? false : config.noSession );
	return wrapper;
};
