var camera, scene, renderer;
var controls, effect;
var mesh;
var stats;
var basescene;

var windowX, windowY;
var windowHalfX, windowHalfY;

var thegrid;
var thearmature = null;

var connection = null;
var opened = false;

var lefthand;
var righthand;
var handsopen = [false, false];
var camtarget;
var fakeobject = {"quat": [0,0,0,1], "pos": [0,0,0]};

var boxtray = null;

var t = 0.0;

$(function(){
	init();
});

function getSize() {
	windowX = window.innerWidth;
	//windowY = window.innerHeight;
	windowY = window.innerHeight;
	windowHalfX = windowX / 2.0;
	windowHalfY = windowY / 2.0;
	console.log("WX: " + windowX + ", WY: " + windowY);
}

function userToggleVRMode() {
	var domElement = this.riftSandbox.container;
	riftSandbox.toggleVrMode();
	if (domElement.mozRequestFullScreen) {
	 	domElement.mozRequestFullScreen({ vrDisplay: deviceManager.hmdDevice });
	} else if (domElement.webkitRequestFullscreen) {
	 	domElement.webkitRequestFullscreen({ vrDisplay: deviceManager.hmdDevice });
	} else {
		console.log("Request fullscreen doesn't seem to exist?");
	}
}

function toggleVrMode() {
	if (!(document.mozFullScreenElement || document.webkitFullScreenElement) &&
		riftSandbox.vrMode) {
		riftSandbox.toggleVrMode();
	}
}


function onKeyDown(event) {
	event.preventDefault();

	if(event.keyCode == 70) { // f
		console.log("Trying to toggle VR mode...");
		effect.setFullScreen( true );
	} else if (event.keyCode == 90) { // z
	    controls.zeroSensor();
	} else {
		console.log("Some other key: " + event.keyCode);
	}
}


function init() {

    document.addEventListener('keydown', onKeyDown);

	renderer = new THREE.WebGLRenderer({antialias: true});
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );

	stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.top = '0px';
	document.body.appendChild( stats.domElement );

	camtarget = new THREE.Object3D();

	getSize();

	//

	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 1000 );
	//camera.position.z = 1.0;

	controls = new THREE.VRControls( camera, fakeobject );

	effect = new THREE.VREffect( renderer );
	effect.setSize( window.innerWidth, window.innerHeight );

	basescene = new THREE.Scene();
	scene = new THREE.Object3D();
	basescene.add(scene);
	scene.position.z = -1.1;
	scene.position.y = -1.3;
	scene.position.x = -0.1;
	scene.rotation.y = -Math.PI / 2.0;

	var models = [
		{"bounds": [0.1,0.1,0.2], "offset": [0,0,-0.1], "url": "obj/fuze_bottle_lo.obj", "texurl": "obj/fuze_bottle_0.jpg"},
		{"bounds": [0.1,0.2,0.3], "offset": [0,0,-0.15], "url": "obj/pops_cereal_lo.obj", "texurl": "obj/pops_cereal_0.jpg"}
	];

	boxtray = new BoxTray(basescene, 10, models);

	// add some lights so we can see stuff
	scene.add( new THREE.AmbientLight( 0x050505 ) );

	var directionalLight = new THREE.PointLight( 0xffdddd, 1.0 );
	directionalLight.position.x = 0; //Math.random() - 0.5;
	directionalLight.position.y = 1; //Math.random() - 0.5;
	directionalLight.position.z = 1; //Math.random() - 0.5;
	//directionalLight.position.normalize();
	scene.add( directionalLight );

	var pointLight = new THREE.PointLight( 0xddddff, 1.0 );
	pointLight.position.set(1, 0.4, -1);
	scene.add(pointLight);

	//window.addEventListener( 'resize', onWindowResize, false );

	thegrid = new BaseGrid(60.0, 60.0, 1.0);
	thegrid.addToScene(scene);

	//initOrbitCamera(camera);

	$.get("atlas.json", function(data) {
		console.log("Got data... trying to build armature...");
		var jdata = JSON.parse(data);
		thearmature = new Armature(scene, jdata, "utorso");
		thearmature.root.rotation.x = -Math.PI / 2.0;
		thearmature.root.position.y = 0.8;

		lefthand = new THREE.Object3D();
		lefthand.position.set(0,0.1,0);
		righthand = new THREE.Object3D();
		righthand.position.set(0,-0.1,0);
		thearmature.links.r_hand.knode.add(righthand);
		thearmature.links.l_hand.knode.add(lefthand);
	});

	animate();

	init_ws();

}

function onWindowResize() {

	// camera.aspect = window.innerWidth / window.innerHeight;
	// camera.updateProjectionMatrix();

	// renderer.setSize( window.innerWidth, window.innerHeight );
	//riftSandbox.resize();
	effect.setSize( window.innerWidth , window.innerHeight );

}

function animate() {

	t += 1.0 / 60.0;
	//console.log(">>>>>>>>>> Enter animate. >>>>>>>>>>>");

	// if(thearmature) {
	// 	thearmature.setJointRotation("l_arm_elx", Math.cos(t));
	// 	thearmature.setJointRotation("l_arm_usy", t);
	// }

	// updateCamera();

	// //composer.render();
	// renderer.render(scene, camera);
	// console.log("In animate:");
	// console.log(fakeobject.quat);
	// console.log(fakeobject.pos);
	// console.log("End animate.");
	//console.log(camera.quaternion);
	//camera.quaternion.set(0.5, 0.5, 0.5 , 0.5);
	//camera.quaternion.copy(camtarget.quaternion);
	mainLoop();
	controls.update();
	effect.render( basescene, camera );

	stats.update();

	requestAnimationFrame( animate );

	//console.log("<<<<<<<<<<<<< Exit animate. <<<<<<<<<<<<");

}

function init_ws() {
	connection = new WebSocket("ws://localhost:9000");
	connection.onopen = function(event) {
		console.log("Opened connection!");
		opened = true;
	};

	connection.onmessage = function(event) {
		//console.log(event.data);
		var jdata = JSON.parse(event.data);
		if(thearmature) {
			thearmature.setJoints(jdata);

			if("right_f3_j0" in jdata && boxtray) {
				handsopen[0] = jdata["right_f3_j0"] > 0.0;
			}

			if("left_f3_j0" in jdata && boxtray) {
				//console.log("Left: " + jdata["left_f3_j0"]);
				handsopen[1] = jdata["left_f3_j0"] > 0.0;
			}
		}
	};

	window.setInterval(ping_data, 30);
}

function ping_data() {
	if(connection && opened) {
		connection.send("ping");
	}
}

function mainLoop() {
	// Update physics
	if(boxtray) {
		boxtray.update();
	}

	if(boxtray && righthand && lefthand) {
		var vector = new THREE.Vector3();
		var child = righthand; //thearmature.links.r_hand.knode;
		vector.setFromMatrixPosition( child.matrixWorld );
		boxtray.updateHand(0, vector, handsopen[0]);
		child = lefthand; //thearmature.links.r_hand.knode;
		vector.setFromMatrixPosition( child.matrixWorld );
		boxtray.updateHand(1, vector, handsopen[1]);	
	}
}