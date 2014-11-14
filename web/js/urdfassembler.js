function flattenFilenames(basedir) {
	var bd = basedir;
	var ret = function(fullpath) {
		var gps = fullpath.split("/");
		var filename = gps[gps.length - 1];
		return bd + filename;
	}
}