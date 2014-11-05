function parseRegex( pattern ) {
	var str = pattern.toString();
	return str.substring( 1, str.length - 2 );
}

function getRegex( pattern ) {
	return new RegExp( pattern );
}

function applyPrefix( prefix, pattern ) {
	var original = parseRegex( pattern );
	if( original.slice( 0, 1 ) === '^' ) {
		return getRegex( '^' + prefix + '/' + original.slice( 1, original.length ) );
	} else {
		return getRegex( '^' + prefix + '/.*' + original );
	}
}

module.exports = {
	create: getRegex,
	parse: parseRegex,
	prefix: applyPrefix
};