function parseRegex( pattern ) {
	var str = pattern.toString();
	return str.substring( 1, str.length - 1 );
}

function getRegex( pattern ) {
	return new RegExp( pattern );
}

function applyPrefix( prefix, pattern ) {
	var original = parseRegex( pattern );
	var prefixed = getRegex( '[^]?' + prefix.replace( '\/', '[\\\/]' ) );
	if ( !prefix || prefixed.test( original ) ) {
		return pattern;
	} else {
		if ( original.slice( 0, 1 ) === '^' ) {
			var trimmed = original.slice( 1, original.length );
			var separator = trimmed.indexOf( '\/' ) === 1 ? '' : '/';
			return getRegex( '^' + prefix + separator + trimmed );
		} else {
			return getRegex( '^' + prefix + '/.*' + original );
		}
	}
}

module.exports = {
	create: getRegex,
	parse: parseRegex,
	prefix: applyPrefix
};
