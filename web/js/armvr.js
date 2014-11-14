var camera, scene, renderer;
var mesh;
var stats;

var windowX, windowY;
var windowHalfX, windowHalfY;

var thegrid;
var thearmature = null;

var connection = null;
var opened = false;

var deviceManager;
var riftSandbox;

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
	if(event.keyCode == 70) { // f
		console.log("Trying to toggle VR mode...");
		userToggleVRMode();
	} else {
		console.log("Some other key: " + event.keyCode);
	}
}


function init() {

	deviceManager = new DeviceManager();
	riftSandbox = new RiftSandbox(window.innerWidth, window.innerHeight);

    deviceManager.onResizeFOV = function (renderTargetSize, fovLeft, fovRight) {
     	riftSandbox.setFOV(fovLeft, fovRight);
    }

    deviceManager.onHMDDeviceFound = function (hmdDevice) {
    	var eyeOffsetLeft = hmdDevice.getEyeTranslation("left");
    	var eyeOffsetRight = hmdDevice.getEyeTranslation("right");
    	riftSandbox.setCameraOffsets(eyeOffsetLeft, eyeOffsetRight);
    }

    document.addEventListener('mozfullscreenchange', toggleVrMode, false);
    document.addEventListener('webkitfullscreenchange', toggleVrMode, false);
    document.addEventListener('keydown', onKeyDown);

    deviceManager.init();

	// renderer = new THREE.WebGLRenderer({antialias: true});
	// renderer.setSize( window.innerWidth, window.innerHeight );
	// document.body.appendChild( renderer.domElement );

	stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.top = '0px';
	document.body.appendChild( stats.domElement );

	getSize();

	//

	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 1000 );
	camera.position.z = 1.0;

	var basescene = riftSandbox.scene; //new THREE.Scene();
	scene = new THREE.Object3D();
	basescene.add(scene);
	scene.position.z = -1.4;
	scene.position.y = -1.3;
	scene.position.x = -0.1;
	scene.rotation.y = -Math.PI / 2.0;

	// add some lights so we can see stuff
	scene.add( new THREE.AmbientLight( 0xcccccc ) );

	var directionalLight = new THREE.DirectionalLight( 0xeeeeee );
	directionalLight.position.x = Math.random() - 0.5;
	directionalLight.position.y = Math.random() - 0.5;
	directionalLight.position.z = Math.random() - 0.5;
	directionalLight.position.normalize();
	scene.add( directionalLight );

	var pointLight = new THREE.PointLight( 0xffffff, 4 );
	scene.add(pointLight);

	window.addEventListener( 'resize', onWindowResize, false );

	thegrid = new BaseGrid(60.0, 60.0, 1.0);
	thegrid.addToScene(scene);

	//initOrbitCamera(camera);

	$.get("atlas.json", function(data) {
		console.log("Got data... trying to build armature...");
		var jdata = JSON.parse(data);
		thearmature = new Armature(scene, jdata, "utorso");
		thearmature.root.rotation.x = -Math.PI / 2.0;
		thearmature.root.position.y = 0.8;
	});

	animate();

	init_ws();

}

function onWindowResize() {

	// camera.aspect = window.innerWidth / window.innerHeight;
	// camera.updateProjectionMatrix();

	// renderer.setSize( window.innerWidth, window.innerHeight );
	riftSandbox.resize();

}

function animate() {

	t += 1.0 / 60.0;

	// if(thearmature) {
	// 	thearmature.setJointRotation("l_arm_elx", Math.cos(t));
	// 	thearmature.setJointRotation("l_arm_usy", t);
	// }

	requestAnimationFrame( animate );

	// updateCamera();

	// //composer.render();
	// renderer.render(scene, camera);
	mainLoop();

	stats.update();

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
		}
	};

	window.setInterval(ping_data, 100);
}

function ping_data() {
	if(connection && opened) {
		connection.send("ping");
	}
}

function mainLoop() {
	// Apply movement
	if (deviceManager.sensorDevice) {
		if (riftSandbox.vrMode) {
		 	riftSandbox.setHmdPositionRotation(deviceManager.sensorDevice.getState());
		}
	}
	if (!deviceManager.sensorDevice || !riftSandbox.vrMode) {
		// maybe update orbitcam here?
	}
	riftSandbox.setBaseRotation();
	riftSandbox.updateCameraPositionRotation();

	riftSandbox.render();
}