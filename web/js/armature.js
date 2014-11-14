function Armature(parentobj, srcdata, rootname) {
	this.srcdata = srcdata;
	this.joints = {};
	this.links = {};
	this.root = new THREE.Object3D();
	parentobj.add(this.root);
	this.buildFrom(rootname);
	this.warnings = {};
}

function hackSetRotation(joint, rot) {
	var n = joint.knode;
	n.rotation.x = joint.axis[0] * rot;
	n.rotation.y = joint.axis[1] * rot;
	n.rotation.z = joint.axis[2] * rot;
}

function properSetRotation(joint, rot) {
	var n = joint.knode;
	var mat = joint.rmat;

	mat.makeRotationAxis(joint.vaxis, rot);
	joint.knode.rotation.setFromRotationMatrix(mat);
}

Armature.prototype.setJointRotation = function(jointname, rotation) {
	if(jointname in this.joints) {
		//hackSetRotation(this.joints[jointname], rotation);
		properSetRotation(this.joints[jointname], rotation);
	} else {
		if(!(jointname in this.warnings)) {
			this.warnings[jointname] = true;
			console.log("Joint " + jointname + " doesn't exist!");
		}
	}
};

Armature.prototype.setJoints = function(jointdict) {
	for(var jname in jointdict) {
		var jval = jointdict[jname];
		this.setJointRotation(jname, jval);
	}
};

Armature.prototype.buildFrom = function(nodename) {
	// first, build a tree of parents
	var tempdata = {};
	var l = this.srcdata.links;
	console.log(this.srcdata);

	for(var linkname in l) {
		console.log(linkname);
		var templink = l[linkname];
		tempdata[linkname] = {name: linkname, vdata: templink, children: [], kdata: null, parent: null, parent_joint: null};
	}
	var j = this.srcdata.joints;
	for(var jointname in j) {
		console.log(jointname);
		var tj = j[jointname];
		if(tj.child in tempdata && tj.parent in tempdata) {
			tempdata[tj.parent].children.push(tempdata[tj.child]);
			tempdata[tj.child].kdata = tj;
			tempdata[tj.child].parent = tempdata[tj.parent];
			tempdata[tj.child].parent_joint = jointname;
		} else {
			console.log("P: " + tj.parent + "/C: " + tj.child + " missing!");
		}
	}
	this.fulldata = tempdata;
	console.log(this.fulldata);

	this.joints["root"] = {knode: this.root, axis: [1,0,0]};
	this.recursiveBuild(this.joints["root"], this.fulldata[nodename]);
};

Armature.prototype.buildLink = function(parent, linkdata) {
	var knode = new THREE.Object3D();
	parent.knode.add(knode);
	var vnode = new THREE.Object3D();
	knode.add(vnode);

	var axis = linkdata.kdata.axis;
	var kp = linkdata.kdata.vpos;
	knode.position.set(kp[0], kp[1], kp[2]);

	var p = linkdata.vdata.vpos;
	var r = linkdata.vdata.vrot;
	var s = linkdata.vdata.vscale;
	//vnode.position.set(p[0], p[1], p[2]);
	//vnode.rotation.set(r[0], r[1], r[2]);
	vnode.scale.set(s[0], s[1], s[2]);
	load_stl("meshes/" + linkdata.vdata.meshname, vnode);

	var vaxis = new THREE.Vector3(axis[0], axis[1], axis[2]);
	vaxis.normalize();
	return {knode: knode, vnode: vnode, axis: axis, rmat: new THREE.Matrix4(), vaxis: vaxis};
};

Armature.prototype.recursiveBuild = function(parent, node) {
	console.log(node);
	console.log("Building " + node.name);

	var cn = node;
	var newnode = this.buildLink(parent, cn);
	this.links[cn.name] = newnode;
	this.joints[cn.parent_joint] = newnode;

	for(var i = 0; i < cn.children.length; ++i) {
		this.recursiveBuild(newnode, cn.children[i]);
	}
};

function load_stl( filename, dest ) {
	var loader = new THREE.STLLoader();
	var tempdest = dest;
	loader.addEventListener( 'load', function ( event ) {

		var geometry = event.content;
		var material = new THREE.MeshPhongMaterial( { ambient: 0xff5533, color: 0xff5533, specular: 0x111111, shininess: 200 } );
		var mesh = new THREE.Mesh( geometry, material );

		dest.add( mesh );

	} );
	loader.load( filename );
}
