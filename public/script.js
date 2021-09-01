var program,
    skyboxProgram;
var gl;
var baseDir;

var skyboxVertPos,
    skyboxVao,
    skyboxVertPosAttr;

var animateIndicator = {}; //indicating active animations of hammers or moles
var animateFrameRate = 20; //frame rate of screen
var moveHammerAnimTimeAsSec = 0.3; //animation duration as sec
var hammerRotation = -40; //currently hammer rotation
var hammerStepRotation; //angular change in each frame rate step
var animateStepIndicator = {"mole":0,"hammer":0}; //holding currently frame rate steps
var animatingMoles={"1":false,"2":false,"3":false,"4":false,"5":false}; //mole is visible or not
var currentAnimatingMole;
var animationMovementCoordinates = {"mole":{"x":0,"y":0,"z":0},"hammer":{"x":0,"y":0,"z":0}}; //target coordinates of animation
var animateStatus = {}; //status of animation trigger
var isGameStarted = false;
var score=0; //holding score
var timer=120;
var timerInterval;
var positionAttributeLocation,
    matrixLocation,
    textLocation,
    normalAttributeLocation ,
    normalMatrixPositionHandle,
    textureEnv,
    inverseViewProjMatrixHandle;

// lights
var
    lightColorL = [0.3, 0.3, 0.3],
    lightColorR = [0.3, 0.3, 0.3],
    lightColorS = [0.1, 0.1, 0.08],
    lightPositionL = [-5.0, 10.0, 20.0], //left light
    lightPositionR = [5.0, 20.0, 20.0],  //right light
    lightPositionS = [0.0, 20.0, 30.0],
    lTarget = 30,
    lDecay = 1.3,
    specShine = 2, //spot light shine-ness
    //direction of light S: (spotlight)
    lightDirS = [1, 7.0, 3.0]
    lConeOut = 30,
    lConeIn = 60,
    ambientLightColor = [0.1, 0.1, 0.05];

var drawSceneFunct;


var lastUpdateTime=(new Date).getTime();

var viewMatrix;

var delta = 0.2;

// Camera Variables
var lookRadius = 15.0;
var cx = 0.0, cy=3, cz=2.5, angle=0 , elevation=-30.0;
var eyePos = [cx,cy,cz];

// Node structure for the scene graph
// example taken from webGLTutorial2
var Node = function() {
  this.children = [];
  this.localMatrix = utils.identityMatrix();
  this.worldMatrix = utils.identityMatrix();
};

Node.prototype.setParent = function(parent) {
  // remove us from our parent
  if (this.parent) {
    var ndx = this.parent.children.indexOf(this);
    if (ndx >= 0) {
      this.parent.children.splice(ndx, 1);
    }
  }

  // Add us to our new parent
  if (parent) {
    parent.children.push(this);
  }
  this.parent = parent;
};

Node.prototype.updateWorldMatrix = function(matrix) {
  if (matrix) {
    // a matrix was passed in so do the math
    this.worldMatrix = utils.multiplyMatrices(matrix, this.localMatrix);
  } else {
    // no matrix was passed in so just copy.
    utils.copy(this.localMatrix, this.worldMatrix);
  }

  // now process all the children
  var worldMatrix = this.worldMatrix;
  this.children.forEach(function(child) {
    child.updateWorldMatrix(worldMatrix);
  });
};

function min(){  //calculating time as minutes and seconds, print it on html

  var min = Math.floor(timer/60);
  var sec = timer%60;
  if(min<10) min = "0"+min.toString();
  if(sec<10) sec = "0"+sec.toString();
  document.getElementById("timer").innerHTML = min.toString()+":"+sec.toString();
  if(timer == 0){
    isGameStarted = false;
    if(timerInterval != null)clearInterval(timerInterval);
  }
  timer--;
}
async function main() {

  //reset canvas
  var lastUpdateTime = (new Date).getTime();

  utils.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);

  //load models
  var cabinet = await loadObject("assets/cabinet.obj");
  var mole = await loadObject("assets/mole.obj");
  var hammer = await loadObject("assets/hammer.obj");

  getAttributeLocations();

  LoadEnvironment();

  var perspectiveMatrix = utils.MakePerspective(90, gl.canvas.width/gl.canvas.height, 0.1, 100.0);

  var vaoCabinet = createVAO(cabinet);
  var vaoMole = createVAO(mole);
  var vaoHammer = createVAO(hammer);

  // list of objects to render

  var objects = defineSceneGraph();

  // Create a texture.
  var texture = gl.createTexture();
  // use texture unit 0
  gl.activeTexture(gl.TEXTURE0);
  // bind to the TEXTURE_2D bind point of texture unit 0
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Asynchronously load the texture
  var image = await loadTexture('assets/Mole.png', texture);

  drawScene();

  function setLightsConfiguration() {

    //Color(intensity)
    gl.uniform3fv(lightColorLLocation, lightColorL);
    gl.uniform3fv(lightColorRLocation, lightColorR);
    gl.uniform3fv(lightColorSLocation, lightColorS);
    gl.uniform3fv(ambientLightLocation, ambientLightColor);

    //Light Positions
    gl.uniform3fv(lightPositionLLocation, lightPositionL);
    gl.uniform3fv(lightPositionRLocation, lightPositionR);
    gl.uniform3fv(lightPositionSLocation, lightPositionS);

    gl.uniform1f(lTargetLocation, lTarget);
    gl.uniform1f(lDecayLocation, lDecay);
    gl.uniform1f(specShineLocation, specShine);

    gl.uniform3fv(lightDirSLocation,lightDirS);
    gl.uniform3fv(eyePositionLocation, eyePos);

    gl.uniform1f(lConeOutLocation, lConeOut);
    gl.uniform1f(lConeInLocation, lConeIn);
  }

  function drawScene() {

    gl.useProgram(program);

    animate();

    mainAnimate();

    //reset canvas
    utils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    setLightsConfiguration();

    //// DRAW THE LIST OF OBJECTS
    for(var i=0; i<objects.length; i++) {
      var viewWorldMatrix = utils.multiplyMatrices(viewMatrix, objects[i].worldMatrix);
      var projectionMatrix = utils.multiplyMatrices(perspectiveMatrix, viewWorldMatrix);

      var normalMatrix = utils.invertMatrix(utils.transposeMatrix(objects[i].worldMatrix));

      // send projection matrix to shaders
      gl.uniformMatrix4fv(matrixLocation, gl.FALSE, utils.transposeMatrix(projectionMatrix));

      // send normal matrix to shaders
      gl.uniformMatrix4fv(normalMatrixPositionHandle, gl.FALSE, utils.transposeMatrix(normalMatrix));

      //BIND TEXTURE
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(textLocation, 0);

      gl.bindVertexArray(objects[i].drawInfo.vertexArray);
      gl.drawElements(gl.TRIANGLES, objects[i].drawInfo.bufferLength, gl.UNSIGNED_SHORT, 0 );
    }

    DrawSkybox();

    window.requestAnimationFrame(drawScene);
  }


  function animate(){
    // var currentTime = (new Date).getTime();

    //camera rotation after mouse interaction
    angle = angle;// + rvy;
    elevation = elevation;// + rvx;

    cz = lookRadius * Math.cos(utils.degToRad(-angle)) * Math.cos(utils.degToRad(-elevation));
    cx = lookRadius * Math.sin(utils.degToRad(-angle)) * Math.cos(utils.degToRad(-elevation));
    cy = lookRadius * Math.sin(utils.degToRad(-elevation));

    viewMatrix = utils.MakeView(cx, cy, cz, elevation, angle);

    // lastUpdateTime = currentTime;
  }


  function mainAnimate(){ // main animate function calling every frame of screen
    if(animateStatus["hammer"] == true && isGameStarted == true){
      moveHammer();
    }
    if(animateStatus["mole"] == true && isGameStarted == true){
      moveMole();
    }
  }
  function animationTrigger(type,i){ // change animation statuses of moles and hammer
    if(type=="hammer"){
        animateStatus["hammer"] = true;
        animateIndicator["hammer"] = i;
        animateStepIndicator["hammer"] = 0;
    }else if(type=="mole"){
        animateStatus["mole"] = true;
        animateIndicator["mole"] = i;
        animateStepIndicator["mole"] = 0;
    }
  }
  function moveMole(){ // function for movement of moles
    if(animateStepIndicator["mole"] == 0){ // checking mole movements is started
      var randomer =Math.floor(Math.random() * 5) + 1;
      animatingMoles[randomer] = !animatingMoles[randomer];
      currentAnimatingMole = randomer;
    }
    var world=objects[currentAnimatingMole].worldMatrix;
    if(animatingMoles[currentAnimatingMole]){ // mole is visible
      world[7]+=((8.5-0)/(animateFrameRate*moveHammerAnimTimeAsSec)); // mole moving to visible side
    }else{
      world[7]-=((8.5-0)/(animateFrameRate*moveHammerAnimTimeAsSec));
    }
    if(animateStepIndicator["mole"] == animateFrameRate*moveHammerAnimTimeAsSec){ // movement is done
      animateStepIndicator["mole"] = -1;
    }
    objects[currentAnimatingMole].worldMatrix=world;
    animateStepIndicator["mole"]++;
  }
  function moveHammer(){ // animation hammer
    var world=objects[6].worldMatrix;

    if(animateStepIndicator["hammer"] == 0){ // beginning of movement
      hammerStepRotation = (-80-(hammerRotation))/(animateFrameRate*moveHammerAnimTimeAsSec); // calculating rotation degree foreach frame
      animationMovementCoordinates["hammer"]["x"] = (objects[animateIndicator["hammer"]].worldMatrix[3]-world[3])/(animateFrameRate*moveHammerAnimTimeAsSec); // calculating translation foreach frame
      animationMovementCoordinates["hammer"]["y"] = (-10-world[7])/(animateFrameRate*moveHammerAnimTimeAsSec);
      animationMovementCoordinates["hammer"]["z"] = (objects[animateIndicator["hammer"]].worldMatrix[11]-world[11])/(animateFrameRate*moveHammerAnimTimeAsSec);
    }else if(animateStepIndicator["hammer"] == animateFrameRate*moveHammerAnimTimeAsSec){ // moving to mole is done
      if(objects[animateIndicator["hammer"]].worldMatrix[7] > -15){ // mole is visible, animateIndicator["hammer"] indicates the number of mole
        score++;
        document.getElementById("score").innerHTML = score;
        if(currentAnimatingMole == animateIndicator["hammer"]){
          animateStepIndicator["mole"] = 0;
        }
        objects[animateIndicator["hammer"]].worldMatrix[7] = -20; // forces to mole down
        animatingMoles[animateIndicator["hammer"]] = false;
      }
      hammerStepRotation = (-40-(hammerRotation))/(animateFrameRate*moveHammerAnimTimeAsSec); // calculating rotation degree for reverse path
      animationMovementCoordinates["hammer"]["x"]=(8-world[3])/(animateFrameRate*moveHammerAnimTimeAsSec);
      animationMovementCoordinates["hammer"]["y"]=(-4-world[7])/(animateFrameRate*moveHammerAnimTimeAsSec);
      animationMovementCoordinates["hammer"]["z"]=(3-world[11])/(animateFrameRate*moveHammerAnimTimeAsSec);
    }

    world[3]+=animationMovementCoordinates["hammer"]["x"];
    world[7]+=animationMovementCoordinates["hammer"]["y"];
    world[11]+=animationMovementCoordinates["hammer"]["z"];

    if(animateStepIndicator["hammer"] == animateFrameRate*moveHammerAnimTimeAsSec*2) animateStatus["hammer"] = false; // when the movement is done, change animatestatus of hammer to false
    hammerRotation += hammerStepRotation; // updating hammer rotating in each steps
    rotate=utils.MakeRotateXMatrix(hammerStepRotation); //rotation calcs
    itrans=utils.multiplyMatrices(rotate,utils.invertMatrix(utils.MakeTranslateMatrix(world[3],world[7],world[11])));
    trans=utils.multiplyMatrices(utils.MakeTranslateMatrix(world[3],world[7],world[11]),itrans);
    world=utils.multiplyMatrices(trans,world);
    objects[6].worldMatrix=world; // assigning of hammer localmatrix to the new matrix
    animateStepIndicator["hammer"]++;
  }

  function DrawSkybox(){
    //use the program for the skybox
    gl.useProgram(skyboxProgram);

    //activate the texture for the environment
    gl.activeTexture(gl.TEXTURE0+3);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);
    gl.uniform1i(skyboxTexHandle, 3);

    //create the inverse of the projection matrix
    var viewProjMat = utils.multiplyMatrices(perspectiveMatrix, viewMatrix);
    inverseViewProjMatrix = utils.invertMatrix(viewProjMat);
    gl.uniformMatrix4fv(inverseViewProjMatrixHandle, gl.FALSE, utils.transposeMatrix(inverseViewProjMatrix));

    //bind the skybox vertex array
    gl.bindVertexArray(skyboxVao);

    gl.depthFunc(gl.LEQUAL);
    //draw triangles
    gl.drawArrays(gl.TRIANGLES, 0, 1*6);
}

  function defineSceneGraph() {
    var objects = [];

    //cabinet node - root
    var cabinetNode = new Node();
    cabinetNode.localMatrix = utils.MakeWorld(  0.0, -20.0, -10.0, 0.0, 0.0, 0.0, 10.0);
    cabinetNode.drawInfo = {
      bufferLength: cabinet.indices.length,
      vertexArray: vaoCabinet
    }
    objects.push(cabinetNode);

    //mole nodes
    //positions for moles: y=1.0 up; y<0.5 down
    var initialX = -1.0;
    var initialY = 0.0;
    var initialZ = 0.0;

    for(i = 0; i<5; i++) {
      initialZ = 0.17 + (i%2) * 0.5;
      initialX += 0.66 / 2;
      var moleNode = new Node();
      moleNode.localMatrix = utils.MakeWorld(initialX, initialY, initialZ, 0.0, 0.0, 0.0, 1.0);
      moleNode.drawInfo = {
        bufferLength: mole.indices.length,
        vertexArray: vaoMole
      }
      moleNode.setParent(cabinetNode);
      objects.push(moleNode);
    }

    //hammer node
    var hammerNode = new Node();
    hammerNode.localMatrix = utils.MakeWorld(0.8, 1.6, 1.3, 0.0,-40.0,-45, 1);
    hammerNode.drawInfo = {
      bufferLength: hammer.indices.length,
      vertexArray: vaoHammer
    }
    hammerNode.setParent(cabinetNode);
    objects.push(hammerNode);

    //update the world matrices based on the root: cabinet
    cabinetNode.updateWorldMatrix();

    return objects;
  }
  function reset(){     //reset infos after timeout or restarting
    for(var i=1;i<6;i++){
      objects[i].worldMatrix[7] = -20;
      animatingMoles[i] = false;
    }
  }
  function keyFunction(e){

    if (e.keyCode == 65) {  // a
      angle-=delta*10.0;
    }
    else if (e.keyCode == 68) {  // d
      angle+=delta*10.0;
    }
    else if (e.keyCode == 87) {  // w
      elevation+=delta*10.0;
    }
    else if (e.keyCode == 83) {  // s
      elevation-=delta*10.0;
    }
    else if (isGameStarted != true) { //return if the game is not started
      return;
    }
    else if (e.keyCode == 49) {  // 1
      animationTrigger("hammer",1); // hammer animation trigger to mole 1
    }
    else if (e.keyCode == 50) {  // 2
      animationTrigger("hammer",2);
    }
    else if (e.keyCode == 51) {  // 3
      animationTrigger("hammer",3);
    }
    else if (e.keyCode == 52) {  // 4
      animationTrigger("hammer",4);
    }
    else if (e.keyCode == 53) {  // 5
      animationTrigger("hammer",5);
    }
  }

  window.addEventListener("keyup", keyFunction, false);

  window.addEventListener('click', event => { // game is starting and restarting after click
      if(event.target.closest("#action-button")){
          timer = 120;
          score = 0;
          document.getElementById("score").innerHTML = "0";
          reset();
          if(timerInterval != null)clearInterval(timerInterval);
          timerInterval = setInterval(function(){ min(); }, 999);
          isGameStarted = true;
          animationTrigger("mole",1);
          document.getElementById("action-button").innerHTML = "RESTART";
      }
    });
}

async function loadTexture(url, texture) {
  var image = new Image();
  image.src = url;
  await image.decode();
  //Make sure this is the active one
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.generateMipmap(gl.TEXTURE_2D);
  return image;
}

// load the environment map
function LoadEnvironment() {

  skyboxVertPos = new Float32Array(
    [
      -5, -5, 1.0,
       5, -5, 1.0,
      -5,  5, 1.0,
      -5,  5, 1.0,
       5, -5, 1.0,
       5,  5, 1.0,
    ]);

  skyboxVao = gl.createVertexArray();
  gl.bindVertexArray(skyboxVao);

  var positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, skyboxVertPos, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(skyboxVertPosAttr);
  gl.vertexAttribPointer(skyboxVertPosAttr, 3, gl.FLOAT, false, 0, 0);

  skyboxTexture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0+3);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);

  var baseName = "assets/env/";

	const faceInfos = [
	  {
	    target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
	    url: baseName+'px.png',
	  },
	  {
	    target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
	    url: baseName+'nx.png',
	  },
	  {
	    target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
	    url: baseName+'py.png',
	  },
	  {
	    target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
	    url: baseName+'ny.png',
	  },
	  {
	    target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
	    url: baseName+'pz.png',
	  },
	  {
	    target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
	    url: baseName+'nz.png',
	  },
	];
	faceInfos.forEach((faceInfo) => {
    const {target, url} = faceInfo;

    // Upload the canvas to the cubemap face.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1000;
    const height = 1000;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;

    // setup each face so it's immediately renderable
    gl.texImage2D(target, level, internalFormat, width, height, 0, format, type, null);

    // Asynchronously load an image
    const image = new Image();
    image.src = url;
    image.addEventListener('load', function() {
        // Now that the image has loaded upload it to the texture.
        gl.activeTexture(gl.TEXTURE0+3);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);
        gl.texImage2D(target, level, internalFormat, format, type, image);
        gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    });


  });
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
}

function getAttributeLocations() {
  //getAttribute location

  //for the objects
  positionAttributeLocation = gl.getAttribLocation(program, "inPosition");
  normalAttributeLocation = gl.getAttribLocation(program, "inNormal");
  matrixLocation = gl.getUniformLocation(program, "matrix");  //projection matrix
  normalMatrixPositionHandle = gl.getUniformLocation(program, 'nMatrix'); //normal matrix
  uvAttributeLocation = gl.getAttribLocation(program, "a_uv");  //uv indices
  textLocation = gl.getUniformLocation(program, "u_texture");   //texture

  //for the skybox
  skyboxTexHandle = gl.getUniformLocation(skyboxProgram, "u_texture");  //texture
  inverseViewProjMatrixHandle = gl.getUniformLocation(skyboxProgram, "inverseViewProjMatrix"); //normal
  skyboxVertPosAttr = gl.getAttribLocation(skyboxProgram, "in_position"); //position

  //for LIGHTS
  // //Directions
  lightDirSLocation = gl.getUniformLocation(program,"lightDirS");

  //Color(intensity)
  lightColorLLocation = gl.getUniformLocation(program,"lightColorL");
  lightColorRLocation = gl.getUniformLocation(program,"lightColorR");
  lightColorSLocation = gl.getUniformLocation(program,"lightColorS");

  //Light Positions
  lightPositionLLocation = gl.getUniformLocation(program,"lightPositionL"); //point light position
  lightPositionRLocation = gl.getUniformLocation(program,"lightPositionR"); //point light position
  lightPositionSLocation = gl.getUniformLocation(program,"lightPositionS"); //spot light position

  lTargetLocation = gl.getUniformLocation(program,"LTarget"); //point light target
  lDecayLocation = gl.getUniformLocation(program,"LDecay"); //point light decay
  specShineLocation = gl.getUniformLocation(program,"SpecShine"); //gamma - bigger = more shiny (smaller highlight)
  ambientLightLocation = gl.getUniformLocation(program,"ambientLightColor");

  eyePositionLocation = gl.getUniformLocation(program,"eyePos"); //camera position
  lConeOutLocation = gl.getUniformLocation(program,"lConeOut");
  lConeInLocation = gl.getUniformLocation(program,"lConeIn");

}

//Create the vertex array that can be used multiple times for drawing the same obj
function createVAO(obj) {
  var vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  var positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(obj.vertices), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);

  var normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(obj.vertexNormals), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(normalAttributeLocation);
  gl.vertexAttribPointer(normalAttributeLocation, 3, gl.FLOAT, false, 0, 0);

  var uvBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(obj.textures), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(uvAttributeLocation);
  gl.vertexAttribPointer(uvAttributeLocation, 2, gl.FLOAT, false, 0, 0);

  var indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(obj.indices), gl.STATIC_DRAW);

  return vao;
}

async function loadObject(url) {
  var objStr = await utils.get_objstr(url);
  return new OBJ.Mesh(objStr);
}

async function loadShaders(vertexShaderName, fragmentShaderName) {
  var shaderDir = "shaders/";

  var customProgram;

  await utils.loadFiles([shaderDir + vertexShaderName, shaderDir + fragmentShaderName], function (shaderText) {
    var vertexShader = utils.createShader(gl, gl.VERTEX_SHADER, shaderText[0]);
    var fragmentShader = utils.createShader(gl, gl.FRAGMENT_SHADER, shaderText[1]);
    customProgram = utils.createProgram(gl, vertexShader, fragmentShader);

  });

  return customProgram;
}

function setupCanvas() {
  var canvas = document.getElementById("mycanvas");
  gl = canvas.getContext("webgl2");
  if (!gl) {
      document.write("GL context not opened");
      return;
  }
  utils.resizeCanvasToDisplaySize(gl.canvas);

  canvas.addEventListener("mousedown", doMouseDown, false);
  canvas.addEventListener("mouseup", doMouseUp, false);
  canvas.addEventListener("mousemove", doMouseMove, false);

}

var mouseState = false;
var lastMouseX = -100, lastMouseY = -100;
function doMouseDown(event) {
	lastMouseX = event.pageX;
	lastMouseY = event.pageY;
	mouseState = true;
}
function doMouseUp(event) {
	lastMouseX = -100;
	lastMouseY = -100;
	mouseState = false;
}
function doMouseMove(event) {
	if(mouseState) {
		var dx = event.pageX - lastMouseX;
		var dy = lastMouseY - event.pageY;
		lastMouseX = event.pageX;
		lastMouseY = event.pageY;

		if((dx != 0) || (dy != 0)) {
			angle = angle + 0.5 * dx;
			elevation = elevation + 0.5 * dy;
		}
	}
}

async function init(){
  setupCanvas();

  skyboxProgram = await loadShaders('skybox_vs.glsl', 'skybox_fs.glsl');
  program = await loadShaders('vs.glsl', 'fs.glsl');

  await main();
}

window.onload = init;
