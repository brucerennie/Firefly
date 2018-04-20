//all "global" variables are contained within params object
function defineParams(){
    ParamsInit = function() {

        this.container = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null
        this.effect = null;
        this.normalRenderer = null;

        this.keyboard = null;

        this.parts = null;
        this.partsKeys;
        this.partsMesh = {};

        this.loaded = false;

        //positions, will be rest below ()
        this.center;
        this.boxSize = 0.;

        //plotting fields
        this.plotParts = {};

        //particle size multiplicative factor
        this.PsizeMult = {};

        //particle default colors;
        this.Pcolors = {};

        //Decimation
        this.Decimate = 1;
        this.plotNmax = {};

        //Filtering
        this.fkeys = {};
        this.SliderF = {};
        this.SliderFmin = {};
        this.SliderFmax = {};
        this.SliderFinputs = {};
        this.updateFilter = {};
        this.filterLims = {};

        //for frustum      
        this.zmax = 5.e10;
        this.zmin = 1;
        this.fov = 45.

        // for dropdowns
        this.gtoggle = {};

        //camera controls
        this.rotatecamera = true;
        this.useStereo = false;
        this.stereoSep = 0.06;
        this.stereoSepMax = 1.;

        //for rendering to image
        this.renderWidth = 1920;
        this.renderHeight = 1200;

        //for deciding whether to show velocity vectors
        this.showVel = {};
        this.velopts = {'line':0., 'arrow':1., 'triangle':2.};
        this.velType = {};
        this.maxVrange = 1000.; //maximum dynamic range for length of velocity vectors

        //for single sliders
        this.SliderN = {};
        this.SliderNmin = {};
        this.SliderNmax = {};
        this.SliderNInputs = {};
        this.SliderP = {};
        this.SliderPmin = {};
        this.SliderPmax = {};
        this.SliderPInputs = {};
        this.SliderD;
        this.SliderDmin;
        this.SliderDmax;
        this.SliderDInputs;
        this.SliderCF;
        this.SliderCFmin;
        this.SliderCFmax;
        this.SliderCFInputs;
        this.SliderSS;
        this.SliderSSmin;
        this.SliderSSmax;
        this.SliderSSInputs;

        //help screen
        this.helpMessage = 1;

        //initial friction value
        this.friction = 0.1;

        //check to see if the UI exists
        this.haveUI = false;

        //for the loading bar
        var screenWidth = window.innerWidth;
        var screenHeight = window.innerHeight;
        this.loadingSizeX = screenWidth*0.5;
        this.loadingSizeY = screenHeight*0.1;
        this.loadfrac = 1.;
    };


    params = new ParamsInit();
}

function initControls(center = null){

    if (params.rotatecamera) {
        xx = params.camera.getWorldDirection()
        params.controls = new THREE.TrackballControls( params.camera, params.renderer.domElement );
        if (center == null){
            params.controls.target = new THREE.Vector3(params.camera.position.x + xx.x, params.camera.position.y + xx.y, params.camera.position.z + xx.z);
        } else {
            params.controls.target = center;

        }
        params.controls.dynamicDampingFactor = params.friction;
    } else {
        params.controls = new THREE.FlyControls( params.camera , params.renderer.domElement);
        params.controls.movementSpeed = 1. - params.friction;
    }

    if (params.haveUI){
        updateUICenterText();
        updateUICameraText();
        updateUIRotText();
    }
}

function init(reset = false) {
    if (reset){
        params.parts.options = params.parts.options0;
    } else {
         //keyboard
        params.keyboard = new KeyboardState();

        // scene
        params.scene = new THREE.Scene();     

        // camera
        var screenWidth = window.innerWidth;
        var screenHeight = window.innerHeight;
        var aspect = screenWidth / screenHeight;
        params.camera = new THREE.PerspectiveCamera( params.fov, aspect, params.zmin, params.zmax);
        params.camera.up.set(0, -1, 0);
        params.scene.add(params.camera);  

        // renderer
        if ( Detector.webgl ) {
            params.renderer = new THREE.WebGLRenderer( {
                antialias:true,
                //preserveDrawingBuffer: true , //so that we can save the image
            } );
        } else {
            params.renderer = new THREE.CanvasRenderer(); 
        }
        params.renderer.setSize(screenWidth, screenHeight);
        params.normalRenderer = params.renderer;

        params.container = document.getElementById('WebGLContainer');
        params.container.appendChild( params.renderer.domElement );

        // events
        THREEx.WindowResize(params.renderer, params.camera);
        THREEx.FullScreen.bindKey({ charCode : 'm'.charCodeAt(0) });

        //stereo
        params.effect = new THREE.StereoEffect( params.renderer );
        params.effect.setAspect(1.);
        params.effect.setEyeSeparation(params.stereoSep);
    }


    //console.log(params.parts.options);


    //initialize center
    if (params.parts.options.hasOwnProperty('center')){
        if (params.parts.options.center == null){
            setCenter(params.parts[params.partsKeys[0]].Coordinates);
        } else {
            params.center = new THREE.Vector3(params.parts.options.center[0], params.parts.options.center[1], params.parts.options.center[2]);
            setBoxSize(params.parts[params.partsKeys[0]].Coordinates);
        }
    } else {
        setCenter(params.parts[params.partsKeys[0]].Coordinates);
    }


    //change location of camera
    if (params.parts.options.hasOwnProperty('camera')){
        params.camera.position.set(params.parts.options.camera[0], params.parts.options.camera[1], params.parts.options.camera[2]);
    } else {
        params.camera.position.set(0,0,-10);
    }

    params.camera.lookAt(params.scene.position);  
    if (params.parts.options.hasOwnProperty('cameraRotation')){
        if (params.parts.options.cameraRotation != null){
            params.rotatecamera = false;
            params.camera.rotation.set(params.parts.options.cameraRotation[0], params.parts.options.cameraRotation[1], params.parts.options.cameraRotation[2]);
        }
    }

    // controls
    initControls(center = params.center);

    

}


function calcFilterLimits(p, fkey){
//calculate limits for the filters
    
    var j=0;
    if (params.parts[p][fkey] != null){
	var i=0;
	min = params.parts[p][fkey][i];
	max = params.parts[p][fkey][i];
	for (i=0; i< params.parts[p][fkey].length; i++){
	    min = Math.min(min, params.parts[p][fkey][i]);
	    max = Math.max(max, params.parts[p][fkey][i]);
	}
	//need to add a small factor here because of the precision of noUIslider
	min -= 0.001;
	max += 0.001;
	params.filterLims[p][fkey] = [min, max];
    }
}

function calcVelVals(p){
    params.parts[p].VelVals = [];
    params.parts[p].magVelocities = [];
    var mag, angx, angy, v;
    var max = -1.;
    var min = 1.e20;
    var vdif = 1.;
    for (var i=0; i<params.parts[p].Velocities.length; i++){
        v = params.parts[p].Velocities[i];
        mag = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
        angx = Math.atan2(v[1],v[0]);
        angy = Math.acos(v[2]/mag);
        if (mag > max){
            max = mag;
        }
        if (mag < min){
            min = mag;
        }
        params.parts[p].VelVals.push([v[0],v[1],v[2]]);
        params.parts[p].magVelocities.push(mag);
    }
    vdif = Math.min(max - min, params.maxVrange);
    for (var i=0; i<params.parts[p].Velocities.length; i++){
        params.parts[p].VelVals[i].push( THREE.Math.clamp((params.parts[p].magVelocities[i] - min) / vdif, 0., 1.));
    }
}
//initialize various values for the parts dict from the input data file, 
function initPVals(reset = false){
    for (var i=0; i<params.partsKeys.length; i++){
    	var p = params.partsKeys[i];
        if (! reset){
        	params.partsMesh[p] = [];
        }
    	params.PsizeMult[p] = params.parts[p].sizeMult;
    	params.Pcolors[p] = params.parts[p].color;
    	params.updateFilter[p] = false;
    	params.filterLims[p] = {};
    	params.plotNmax[p] = params.parts[p].Coordinates.length;
    	params.plotParts[p] = true;

    	params.parts[p].nMaxPlot = Math.min(params.parts[p].nMaxPlot, params.parts[p].Coordinates.length);

        if (params.parts[p].Velocities != null){
            if (!reset){
                calcVelVals(p);
                params.parts[p].filterKeys.push("magVelocities");
            }
            params.velType[p] = 'line';
            //console.log(p, params.parts[p].VelVals, params.parts[p].Velocities)
        }
        params.showVel[p] = false;
        params.fkeys[p] = params.parts[p].filterKeys;
        for (var k=0; k<params.fkeys[p].length; k++){
            calcFilterLimits(p, params.fkeys[p][k]);
        }
    }


}

function setCenter(coords){
    var sum = [0., 0., 0.];
    for( var i = 0; i < coords.length; i++ ){
        sum[0] += coords[i][0];
        sum[1] += coords[i][1];
        sum[2] += coords[i][2];
    }
    params.center = new THREE.Vector3(sum[0]/coords.length, sum[1]/coords.length, sum[2]/coords.length);

    setBoxSize(coords);

}

function setBoxSize(coords){
    var fee, foo;
    for( var i = 0; i < coords.length; i++ ){
        foo = new THREE.Vector3(coords[i][0], coords[i][0], coords[i][0]);
        fee = params.center.distanceTo(foo)
        if (fee > params.boxSize){
            params.boxSize = fee;
        }
    }
}

function loadData(callback){

    defineParams();
    drawLoadingBar();


    d3.json("data/filenames.json",  function(files) {
    //d3.json("data/filenamesBox.json",  function(files) {
	console.log(files)
	params.partsKeys = Object.keys(files);
	params.parts = {};
	params.partsKeys.forEach( function(p, i) {
	    params.parts[p] = {};
	    d3.json("data/"+files[p],  function(foo) {
	//  d3.json(files[p],  function(foo) {
		params.parts[p] = foo;
		if (i ==  params.partsKeys.length-1){
            setTimeout(function(){ 
                var index = params.partsKeys.indexOf('options');
                if (index > -1) {
                    params.partsKeys.splice(index, 1);
                    params.parts.options0 = JSON.parse(JSON.stringify(params.parts.options));
                }
                callback(); 
            }, 1000); //silly, but seems to fix the problem with loading
		}
        });
	});

 
    });

}

function drawLoadingBar(){

    var screenWidth = parseFloat(window.innerWidth);

    //Make an SVG Container
    var svgContainer = d3.select("#splashdivLoader").append("svg")
        .attr("width", screenWidth)
        .attr("height", params.loadingSizeY);


    // var r1 = svgContainer.append("rect")
    //     .attr('id','loadingRect')
    //     .attr("x", (screenWidth - params.loadingSizeX)/2)
    //     .attr("y", 0)//(screenHeight - sizeY)/2)
    //     .attr("width",params.loadingSizeX)
    //     .attr("height",params.loadingSizeY)
    //     .attr('fill','#4E2A84');

    var r2 = svgContainer
        .data(params.loadfrac)
        .enter()
        .append("rect")
        .attr('id','loadingRect')
        .attr("x", (screenWidth - params.loadingSizeX)/2)
        .attr("y", 0)//(screenHeight - sizeY)/2)
        .attr("width",function(d, i){return params.loadingSizeX*params.loadfrac;})
        .attr("height",params.loadingSizeY)
        .attr('fill','#4E2A84');


    window.addEventListener('resize', moveLoadingBar);

}
function moveLoadingBar(){
    var screenWidth = parseFloat(window.innerWidth);
    d3.selectAll('#loadingRect').attr('x', (screenWidth - params.loadingSizeX)/2);
}

//check if the data is loaded
function clearloading(){
    params.loaded = true;
    // stop spin.js loader
    spinner.stop();

    //show the rest of the page
    d3.select("#ContentContainer").style("visibility","visible")

    console.log("loaded")
    d3.select("#loader").style("display","none")
    d3.select("#splashdiv5").text("Click to begin.");

}


function WebGLStart(){


    clearloading();

//reset the window title
    if (params.parts.options.hasOwnProperty('title')){
        window.document.title = params.parts.options.title
    }

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);

    initPVals();

    init();

    createUI();
    mouseDown = false;  //silly fix

//draw everything
    drawScene();
    
//begin the animation
    animate();
}

//////this will define the params object (that contains all "global" variables), then load the data, and then start the WebGL rendering
loadData(WebGLStart);
