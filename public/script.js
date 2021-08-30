var program,
    skyboxProgram;
var gl;
var baseDir;

var skyboxVertPos,
    skyboxVao,
    skyboxVertPosAttr;

var positionAttributeLocation,
    matrixLocation,
    textLocation,
    normalAttributeLocation ,
    materialDiffColorHandle,
    lightDirectionHandle,
    lightColorHandle,
    normalMatrixPositionHandle,
    textureEnv,
    inverseViewProjMatrixHandle;

var directionalLight,
    directionalLightColor,
    materialColor;

// lights
var 
    // lightDirL,
    // lightDirR, 
    // lightDirS, 
    lightColorL = [0.3, 0.3, 0.3],
    lightColorR = [0.1, 1.0, 1.0],
    lightColorS = [0.1, 1.0, 1.0],
    lightPositionL = [-20.0, 20.0, 20.0],
    lightPositionR = [5.0, 1.5, 2.0],
    lightPositionS = [0.0, 1.5, 2.0],
    lTarget = 60 , 
    lDecay = 2,
    specShine;

var viewMatrix;

var drawSceneFunct;

var delta = 0.2;

// Camera Variables
var lookRadius = 10.0;
var cx = 0.0, cy=3, cz=2.5, angle=0 , elevation=-30.0;

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


async function main() {

  var materialColor = [0.5, 0.5, 0.5];

  //reset canvas 
  utils.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0); 
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);

  defineDirectionalLight();

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

    //Light Positions
    gl.uniform3fv(lightPositionLLocation, lightPositionL);
    gl.uniform3fv(lightPositionRLocation, lightPositionR);
    gl.uniform3fv(lightPositionSLocation, lightPositionS);

    gl.uniform1f(lTargetLocation, lTarget);
    gl.uniform1f(lDecayLocation, lDecay);
    gl.uniform1f(specShineLocation, specShine);
  }

  function animate(){
    var currentTime = (new Date).getTime();

    //camera rotation after mouse interaction
    angle = angle;// + rvy;
    elevation = elevation;// + rvx;
    
    cz = lookRadius * Math.cos(utils.degToRad(-angle)) * Math.cos(utils.degToRad(-elevation));
    cx = lookRadius * Math.sin(utils.degToRad(-angle)) * Math.cos(utils.degToRad(-elevation));
    cy = lookRadius * Math.sin(utils.degToRad(-elevation));

    viewMatrix = utils.MakeView(cx, cy, cz, elevation, angle);

    lastUpdateTime = currentTime;               
  }

  function drawScene() { 

    gl.useProgram(program);

    animate();

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

      //send info about object and light colors to shader
      gl.uniform3fv(materialDiffColorHandle, materialColor);
      gl.uniform3fv(lightColorHandle,  directionalLightColor);
      gl.uniform3fv(lightDirectionHandle,  directionalLight);

        //BIND TEXTURE
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(textLocation, 0);

      gl.bindVertexArray(objects[i].drawInfo.vertexArray);
      gl.drawElements(gl.TRIANGLES, objects[i].drawInfo.bufferLength, gl.UNSIGNED_SHORT, 0 );
    }

    DrawSkybox();

    // window.requestAnimationFrame(drawScene);

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
    //todo: ????
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

    //positions for moles: y=1.0 up; y<0.5 down

    var initialX = -1.0;
    var initialY = 1.0;
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

    var hammerNode = new Node();
    hammerNode.localMatrix = utils.MakeWorld(  0.5, 1.0, 1.3, 0.0,-20.0,-45, 1.0);
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

  function keyFunction(e){
 
      if (e.keyCode == 37) {  // Left arrow
        cx-=delta;
      }
      if (e.keyCode == 39) {  // Right arrow
        cx+=delta;
      } 
      if (e.keyCode == 38) {  // Up arrow
        cz-=delta;
      }
      if (e.keyCode == 40) {  // Down arrow
        cz+=delta;
      }
      if (e.keyCode == 32) { // Space
        cy+=delta;
      }
      if (e.keyCode == 13) { // Enter
        cy-=delta;
      }
      
      if (e.keyCode == 65) {  // a
        angle-=delta*10.0;
      }
      if (e.keyCode == 68) {  // d
        angle+=delta*10.0;
      } 
      if (e.keyCode == 87) {  // w
        elevation+=delta*10.0;
      }
      if (e.keyCode == 83) {  // s
        elevation-=delta*10.0;
      }
      
      window.requestAnimationFrame(drawScene);
  }

  drawSceneFunct = drawScene;

  //// 'window' is a JavaScript object (if "canvas", it will not work)
  window.addEventListener("keyup", keyFunction, false);

  window.requestAnimationFrame(drawScene);

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
  
  materialDiffColorHandle = gl.getUniformLocation(program, 'mDiffColor');
  lightDirectionHandle = gl.getUniformLocation(program, 'lightDirection');
  lightColorHandle = gl.getUniformLocation(program, 'lightColor');

  //for the skybox
  skyboxTexHandle = gl.getUniformLocation(skyboxProgram, "u_texture");  //texture
  inverseViewProjMatrixHandle = gl.getUniformLocation(skyboxProgram, "inverseViewProjMatrix"); //normal 
  skyboxVertPosAttr = gl.getAttribLocation(skyboxProgram, "in_position"); //position

  //for LIGHTS
  // //Directions
  // lightDirLLocation = gl.getUniformLocation(program,"lightDirL");
  // lightDirLLocation = gl.getUniformLocation(program,"lightDirR");
  // lightDirLLocation = gl.getUniformLocation(program,"lightDirS");

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
  specShineLocation = gl.getUniformLocation(program,"SpecShine");

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

function defineDirectionalLight() {
  //define directional light  
  var dirLightAlpha = -utils.degToRad(60);
  var dirLightBeta  = -utils.degToRad(120);

  directionalLight = [Math.cos(dirLightAlpha) * Math.cos(dirLightBeta),
              Math.sin(dirLightAlpha),
              Math.cos(dirLightAlpha) * Math.sin(dirLightBeta)
              ];
  directionalLightColor = [1.0, 1.0, 1.0];
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

async function init(){
  
    setupCanvas();
    
    skyboxProgram = await loadShaders('skybox_vs.glsl', 'skybox_fs.glsl');
    program = await loadShaders('vs.glsl', 'fs.glsl');
    
    await main();
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
    window.requestAnimationFrame(drawSceneFunct);

	}
}


window.onload = init;
