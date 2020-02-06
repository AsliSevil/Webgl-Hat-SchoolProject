"use strict";

var gl;

//DISPLAY OPTIONS:
var displayOption = false;
var displayTexture = false;

//Viewing
var isViewOrtho = true;

//ROTATING OPTIONS:
var isSpinning = false;

//TRANSPERANCY OPTIONS:
var transparentOption = false;

var nRows = 60;
var nColumns = 60;

//PROGRAM TRANSITION:
var isProgram1 = true;

// data for radial hat function: sin(Pi*r)/(Pi*r)

var data = [];
for( var i = 0; i < nRows; ++i ) {
    data.push( [] );
    var x = Math.PI*(4*i/nRows-2.0);

    for( var j = 0; j < nColumns; ++j ) {
        var y = Math.PI*(4*j/nRows-2.0);
        var r = Math.sqrt(x*x+y*y);

        // take care of 0/0 for r = 0

        data[i][j] = r ? Math.sin(r) / r : 1.0;
    }
}

var pointsArray = [];

var fColor;

var near = -10;
var far = 10;
var radius = 2.0;
var theta  = 0.0;
var phi    = 0.0;
var dr = 5.0 * Math.PI/180.0;

var  fovy = 45.0;  // Field-of-view in Y direction angle (in degrees)
var  aspect;       // Viewport aspect ratio

var transparency = 1.0;
var isTransparent = false;

var colorOptions= [
    vec4(0.0, 0.0, 0.0, 1.0),   //BLACK
    vec4(1.0, 0.0, 0.0, 1.0),   //RED
    vec4(0.0, 0.0, 1.0, 1.0),   //BLUE
    vec4(0.33, 0.0, 0.40, 1.0), //PURPLE
    vec4(0.0, 1.0, 0.0, 1.0),   //GREEN
    vec4(1.0, 1.0, 0.0, 1.0),   //YELLOW
    vec4(0.5, 0.5, 0.5, 1.0),   //GRAY
    vec4(0.0, 1.0, 0.94, 1.0),  //TURQUOISE
    vec4(1.0, 0.49, 0.0, 1.0),  //ORANGE
    vec4(1.0, 0.30, 0.65, 1.0)  //PINK
];

//SECİLEN RENK:
var prefColor = colorOptions[9];

const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

var left = -2.5;
var right = 2.5;
var ytop = 1.5;
var bottom = -1.5;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

//ROTATE
var xAxis = 0;
var yAxis = 1;
var zAxis = 2;
var axis = xAxis;
var thetaR = [0.0, 0.0, 0.0];

var thetaLoc;

//TEXTUREEE ---------------------*************
var numVertices  = 36;

var texSize = 16;

// Create a checkerboard pattern using floats


var image1 = new Array()
    for (var i =0; i<texSize; i++)  image1[i] = new Array();
    for (var i =0; i<texSize; i++)
        for ( var j = 0; j < texSize; j++)
           image1[i][j] = new Float32Array(4);
    for (var i =0; i<texSize; i++) for (var j=0; j<texSize; j++) {
        var c = (((i & 0x8) == 0) ^ ((j & 0x8)  == 0));
        image1[i][j] = [c, c, c, 1];
    }

// Convert floats to ubytes for texture

var image2 = new Uint8Array(4*texSize*texSize);

    for ( var i = 0; i < texSize; i++ )
        for ( var j = 0; j < texSize; j++ )
           for(var k =0; k<4; k++)
                image2[4*texSize*i+4*j+k] = 255*image1[i][j][k];


function configureTexture(image) {
    var texture = gl.createTexture();
    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D, texture );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0,
        gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap( gl.TEXTURE_2D );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
        gl.NEAREST_MIPMAP_LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
}

var texCoordsArray = [];

var texCoord = [
    vec2(0, 0),
    vec2(0, 1),
    vec2(1, 1),
    vec2(1, 0)
];
var colorsArray = [];
//----------------------------*******************
var program;
function texturecBufferInitializer(program)
{
    var cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colorsArray), gl.STATIC_DRAW );
    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);
}
function texturetBufferInitializer(program)
{
    var tBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(texCoordsArray ), gl.STATIC_DRAW );
    var vTexCoord = gl.getAttribLocation( program, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);
}
function switchShaders(isProgram1)
{
    var program1 = initShaders( gl, "vertex-shader1", "fragment-shader1" );
    var program2 = initShaders( gl, "vertex-shader2", "fragment-shader2" );
    
    if(isProgram1 == true)
        program = program1;
    else
        program = program2;

    gl.useProgram( program );

    if(program == program2)
    {
        texturecBufferInitializer(program);
    }
    
    var vBufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBufferId );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    fColor = gl.getUniformLocation(program, "fColor");

    if(program == program2)
    {
        texturetBufferInitializer(program);
    }
    configureTexture(image2);

    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
}

window.onload = function init()
{
    var canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );

    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

    aspect =  canvas.width/canvas.height;
    // enable depth testing and polygon offset
    // so lines will be in front of filled triangles

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.0, 2.0);

// vertex array of nRows*nColumns quadrilaterals
// (two triangles/quad) from data

    for(var i=0; i<nRows-1; i++) {
        for(var j=0; j<nColumns-1;j++) {
            pointsArray.push( vec4(2*i/nRows-1, data[i][j], 2*j/nColumns-1, 1.0));
            pointsArray.push( vec4(2*(i+1)/nRows-1, data[i+1][j], 2*j/nColumns-1, 1.0));
            pointsArray.push( vec4(2*(i+1)/nRows-1, data[i+1][j+1], 2*(j+1)/nColumns-1, 1.0));
            pointsArray.push( vec4(2*i/nRows-1, data[i][j+1], 2*(j+1)/nColumns-1, 1.0) );
    }
}

    for(var i=0; i<pointsArray.length;i+=2)
    {
        texCoordsArray.push(texCoord[0]);
        texCoordsArray.push(texCoord[1]);
        texCoordsArray.push(texCoord[2]);
        texCoordsArray.push(texCoord[3]);
    }

    //
    //  Load shaders and initialize attribute buffers
    //
        switchShaders(isProgram1);

// buttons for moving viewer and changing size

    thetaLoc = gl.getUniformLocation(program, "thetaR");

      //COLOR CHANGE:
      document.getElementById("Controls" ).onclick = function(event) {
        switch( event.target.index ) 
        {
          case 0:
            prefColor = colorOptions[1];
            break;
         case 1:
            prefColor = colorOptions[2];
            break;
         case 2:
            prefColor = colorOptions[3];
            break;
         case 3:
            prefColor = colorOptions[4];
            break;
         case 4:
            prefColor = colorOptions[5];
            break;
         case 5:
            prefColor = colorOptions[6];
            break;
         case 6:
            prefColor = colorOptions[7];
            break;
         case 7:
            prefColor = colorOptions[8];
            break;
         case 8:
            prefColor = colorOptions[9];
            break
        }
    };
    document.getElementById("Display").onclick = function(event)
    {
        switch(event.target.index)
        {
            case 0:
                displayOption = false;
                displayTexture = false;
                isProgram1 = true;
                switchShaders(isProgram1);
                break;
            case 1:
                displayOption = true;
                displayTexture = false;
                isProgram1 = true;
                switchShaders(isProgram1);
                break;
            case 2:
                displayTexture = true;
                displayOption = false;
                isProgram1 = false;
                switchShaders(isProgram1);
        }
    }

     //SCALE
     document.getElementById("BiggerBtn").onclick = function(){ytop  *= 0.9; bottom *= 0.9; left  *= 0.9; right *= 0.9;};
     document.getElementById("SmallerBtn").onclick = function(){ytop *= 1.1; bottom *= 1.1; left *= 1.1; right *= 1.1;};

     //ROTATE
     document.getElementById("RotateX").onclick = function(){axis = xAxis;};
     document.getElementById("RotateY").onclick = function(){axis = yAxis;};
     document.getElementById("RotateZ").onclick = function(){axis = zAxis;};
     document.getElementById("StopRotate").onclick = function(){
        if(isSpinning == false)
            isSpinning = true;
        else if(isSpinning == true)
            isSpinning = false;
     };

     //REPOSITION:
     window.onkeydown = function(event) {
        var key = String.fromCharCode(event.keyCode);
        switch(key) {
          case 'W':
            ytop-=0.3; bottom-=0.3;
            break;

          case 'S':
            ytop+=0.3; bottom+=0.3;
            break;

          case 'D':
            left-=0.5; right-=0.5;
            break;

          case 'A':
            left+=0.5; right+=0.5;
            break;
        }
    };

     document.getElementById("transparentButton").onclick = function(){
                
            for(var i=0; i<colorOptions.length; i++)
            {
                colorOptions[i][3] = 1.0;
            }
        };
            
     document.getElementById("notTransparentButton").onclick = function(){
            for(var i=0; i<colorOptions.length; i++)
            {
                colorOptions[i][3] = 0.0;
            }
        };

    document.getElementById("orthogonalBtn").onclick = function(){isViewOrtho = true; };
    document.getElementById("perspectiveBtn").onclick = function(){isViewOrtho = false; };
    
    document.getElementById("increaseZ").onclick = function(){near  *= 1.1; far *= 1.1;};
    document.getElementById("decreaseZ").onclick = function(){near *= 0.9; far *= 0.9;};
    document.getElementById("increaseR").onclick = function(){radius *= 2.0;};
    document.getElementById("decreaseR").onclick = function(){radius *= 0.5;};
    document.getElementById("increaseTheta").onclick = function(){theta += dr;};
    document.getElementById("decreaseTheta").onclick = function(){theta -= dr;};
    document.getElementById("increasePhi").onclick = function(){phi += dr;};
    document.getElementById("decreasePhi").onclick = function(){phi -= dr;};

    render();

}

function rotateModel()
{
    if(isSpinning) thetaR[axis] += 0.5;

    modelViewMatrix = mat4();

    modelViewMatrix = mult(modelViewMatrix, rotate(thetaR[xAxis], [1, 0, 0]));
    modelViewMatrix = mult(modelViewMatrix, rotate(thetaR[yAxis], [0, 1, 0]));
    modelViewMatrix = mult(modelViewMatrix, rotate(thetaR[zAxis], [0, 0, 1]));

    projectionMatrix = ortho(left, right, bottom, ytop, near, far);


    gl.uniformMatrix4fv( gl.getUniformLocation(program, "modelViewMatrix"), false, flatten(modelViewMatrix) );

}

function render()
{
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var eye =  vec3(radius*Math.sin(theta)*Math.cos(phi),
                    radius*Math.sin(theta)*Math.sin(phi),
                    radius*Math.cos(theta));
    
    modelViewMatrix = lookAt(eye, at , up);

    if(isViewOrtho == true)
    {
         near = -10;
         far = 10;
         projectionMatrix = ortho(left, right, bottom, ytop, near, far);

         gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
        if(isSpinning == true)
        {
        console.log(isSpinning);
        rotateModel();
        }
        else if(isSpinning == false)
        {
            thetaR = [0, 0, 0.0];
        }
    }
    else
    {
        projectionMatrix = perspective(fovy, aspect, 0.1, 20);
        gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    }
        gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projectionMatrix) );

    // draw each quad as two filled red triangles
    // and then as two black line loops
    
    for(var i=0; i<pointsArray.length; i+=4) {
        gl.uniform4fv(fColor, flatten(prefColor));
        
        gl.drawArrays( gl.TRIANGLE_FAN, i, 4 );
        if(displayOption == true)
        {
            gl.uniform4fv(fColor, flatten(colorOptions[0]));
            gl.drawArrays( gl.LINE_LOOP, i, 4 );
        }
    }
    requestAnimFrame(render);
}