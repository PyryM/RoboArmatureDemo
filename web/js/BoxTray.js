function BoxTray(scene, nboxes) {
	this.scene = scene;
	this.nboxes = nboxes;
	this.hands = [];
	this.meshes = [];
	this.bodies = [];
	this.bsize = 0.10;
	this.voffset = -0.5;

	this.initCannon();
}

BoxTray.prototype.update = function(dt) {
    this.world.step(dt || (1.0 / 60.0));
    for(var i = 0; i < this.meshes.length; ++i) {
        this.meshes[i].position.copy(this.bodies[i].position);
        this.meshes[i].quaternion.copy(this.bodies[i].quaternion);
    }
};

BoxTray.prototype.createBoxes = function(N) {
    // Create boxes
    var mass = 5, radius = 1.3;
    var boxBody;
    var bs = this.bsize;
    var cubeGeo = new THREE.BoxGeometry( bs, bs, bs, 10, 10 );
    //var cubeMaterial = new THREE.MeshPhongMaterial( { color: 0x888888 } );
    var boxMesh;

    var hs = this.bsize / 2.0;
    this.boxShape = new CANNON.Box(new CANNON.Vec3(hs, hs, hs));

    for(var i = 0; i < N; ++i){
        boxBody = new CANNON.Body({ mass: mass });
        boxBody.addShape(this.boxShape);
        boxBody.position.set(0, (i+1)*this.bsize*1.1 + this.voffset, -0.6);
        this.world.add(boxBody);
        //console.log(this);
        this.bodies.push(boxBody);
        var cubeMaterial = new THREE.MeshPhongMaterial( { //ambient: 0xff5533, 
        												  //color: 0xff5533, 
        												  specular: 0x111111, 
        												  shininess: 200 } );
        cubeMaterial.color.setRGB(Math.random(), Math.random(), Math.random());

	    boxMesh = new THREE.Mesh(cubeGeo, cubeMaterial);
	    //boxMesh.castShadow = true;
	    this.meshes.push(boxMesh);
	    this.scene.add(boxMesh);
    }
};

BoxTray.prototype.findCubeAtPosition = function(pos) {
	var dx, dy, dz;
	var dd;
	var p1;
	var tt = this.bsize * 1.3;
	var minbody = null;
	var mindist = 1000.0;
	for(var i = 0; i < this.bodies.length; ++i) {
		p1 = this.bodies[i].position;
		dx = p1.x - pos.x;
		dy = p1.y - pos.y;
		dz = p1.z - pos.z;
		dd = Math.sqrt(dx*dx + dy*dy + dz*dz);
		if(dd < tt && dd < mindist) {
			mindist = dd;
			minbody = this.bodies[i];
		}
	}
	return minbody;
};

BoxTray.prototype.createHandJoint = function(x, y, z, jointBody, constrainedBody) {
	// Vector to the clicked point, relative to the body
	var v1 = new CANNON.Vec3(x,y,z).vsub(constrainedBody.position);

	// Apply anti-quaternion to vector to tranform it into the local body coordinate system
	var antiRot = constrainedBody.quaternion.inverse();
	var pivot = antiRot.vmult(v1); // pivot is not in local body coordinates

	// Move the cannon click marker particle to the click position
	jointBody.position.set(x,y,z);

	// Create a new constraint
	// The pivot for the jointBody is zero
	var mouseConstraint = new CANNON.PointToPointConstraint(constrainedBody, pivot, jointBody, new CANNON.Vec3(0,0,0));

	// Add the constraint to world
	this.world.addConstraint(mouseConstraint);

	return mouseConstraint;
};

BoxTray.prototype.closeHand = function(idx) {
	console.log("Closing hand " + idx);
	this.hands[idx].closed = true;
	// try to find a cube in the hand...
	var targetcube = this.findCubeAtPosition(this.hands[idx].body.position);
	if(targetcube) {
		var p = this.hands[idx].body.position;
		var constr = this.createHandJoint(p.x, p.y, p.z, this.hands[idx].body, targetcube);
		this.hands[idx].constraint = constr;
	}
	this.hands[idx].mat.color.setRGB(1,0,0); // = 0xff0000;
};

BoxTray.prototype.openHand = function(idx) {
	console.log("Opening hand " + idx);
	this.hands[idx].closed = false;
	if(this.hands[idx].constraint) {
		this.world.removeConstraint(this.hands[idx].constraint);
		this.hands[idx].constraint = null;
	}
	this.hands[idx].mat.color.setRGB(0,1,0); // = 0x00ff00;
};

BoxTray.prototype.createHands = function() {
	this.handShape = new THREE.SphereGeometry(0.05, 8, 8);

	for(var i = 0; i < 2; ++i) {
	    // Joint body
	    var handMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000 } );
	    var shape = new CANNON.Sphere(0.1);
	    var jointBody = new CANNON.Body({ mass: 0 });

	    jointBody.addShape(shape);
	    jointBody.collisionFilterGroup = 0;
	    jointBody.collisionFilterMask = 0;

	    this.world.add(jointBody)

	    var handmesh = new THREE.Mesh(this.handShape, handMaterial);
	    this.scene.add(handmesh);

	    this.hands.push({body: jointBody, mesh: handmesh, closed: false, constraint: null, mat: handMaterial});
	}
};

BoxTray.prototype.updateHand = function(idx, position, closed) {
	this.hands[idx].body.position.set(position.x, position.y, position.z);
	this.hands[idx].mesh.position.set(position.x, position.y, position.z);
	if(this.hands[idx].closed && !closed) {
		this.openHand(idx);
	}
	if(!(this.hands[idx].closed) && closed) {
		this.closeHand(idx);
	}
};

BoxTray.prototype.initCannon = function () {
    // Setup our world
    this.world = new CANNON.World();
    this.world.quatNormalizeSkip = 0;
    this.world.quatNormalizeFast = false;

    this.world.gravity.set(0,-10,0);
    this.world.broadphase = new CANNON.NaiveBroadphase();

    // Create a plane
    var groundShape = new CANNON.Plane();
    var groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2);
    groundBody.position.set(0, this.voffset, 0);
    this.world.add(groundBody);

    var planeGeo = new THREE.PlaneGeometry( 2, 2 ); //new THREE.BoxGeometry( 3, 0.1, 3, 10, 10 );
    var planeMat = new THREE.MeshPhongMaterial( { //ambient: 0xff5533, 
    												  color: 0xffffff, 
    												  specular: 0x111111, 
    												  shininess: 50 } );

    planeMesh = new THREE.Mesh(planeGeo, planeMat);
    planeMesh.rotation.x = -Math.PI / 2.0;
    planeMesh.position.y = this.voffset;
    this.scene.add(planeMesh);

    this.createHands();
    this.createBoxes(this.nboxes);
}