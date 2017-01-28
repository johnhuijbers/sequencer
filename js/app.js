function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++ ) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

var TrackType = {
  MIDI: "midi",
  Audio: "audio",
  Bus: "bus"
};

/**
 * Represents a single track. @see TrackType for available types
 *
 * @author John Huijbers
 */
var Track = function(id, type, track){
  this.id = id;
  this.type = type;
  this.name = track ? track.name ? track.name : type + " track" : type + " track";
  this.selected = false;

  this.chain = [];
  var instruments = this.instruments = [];

  this.meter = new Tone.Meter("level");
  this.volume = new Tone.Volume(-6).connect(this.meter).toMaster();

  if (type == TrackType.MIDI){

    var delay;
    this.chain.push(new Tone.Chorus(1, 2.5, 0.5));

    for (var i = 0; i < this.chain.length; i++){
      var deviceA = this.chain[i];
      var deviceB = this.chain[i+1];

      if (deviceA && deviceB){
        deviceA.connect(deviceB);
      }
      else if (deviceA && !deviceB){
        deviceA.connect(this.volume)
      }
    }

    var options = {
    };

    if (this.id == 2){
      options["envelope"] = {
        attack : 0.001,
          decay : 0.1,
          sustain: 0.1,
          release: 0.1
      }
    }

    this.instruments.push(new Tone.PolySynth(4, Tone.Synth, options).connect(this.chain[0]));

    var partCallback = function(time, note) {
      instruments.forEach(function(instrument){
        instrument.triggerAttackRelease(note.name, note.duration, time, note.velocity);
      })
    };

    this.part = new Tone.Part(partCallback, track.notes);
    this.midi = App.midi.track();
  }
};

Track.prototype = {
  startup: function(){
    if (this.type != TrackType.MIDI) return;

    this.slider = new Interface.Slider({
      tone : this.volume,
      param : "volume",
      name : "",
      max : 20,
      min : -30,
      parent: this.head
    });

    //drawing the FFT
    var meter = this.meter;
    var meterNode = $("<canvas>",{
      "class" : "meter"
    }).appendTo(this.head);

    var meterContext = meterNode.get(0).getContext("2d");

    var meterGraident;

    function drawMeter(){
      var level = meter.value * 0.8; //scale it since values go above 1 when clipping
      meterContext.clearRect(0, 0, canvasWidth, canvasHeight);
      meterContext.fillStyle = meterGraident;
      meterContext.fillRect(0, 0, canvasWidth, canvasHeight);
      meterContext.fillStyle = "gray";
      meterContext.fillRect(canvasWidth * level, 0, canvasWidth, canvasHeight);
    }

    //size the canvase
    var canvasWidth, canvasHeight;

    function sizeCanvases(){
      canvasWidth = meterNode.width();
      canvasHeight = meterNode.height();
      meterContext.canvas.width = canvasWidth;
      meterContext.canvas.height = canvasHeight;
      //make the gradient
      meterGraident = meterContext.createLinearGradient(0, 0, canvasWidth, canvasHeight);
      meterGraident.addColorStop(0, "#BFFF02");
      meterGraident.addColorStop(0.8, "#02FF24");
      meterGraident.addColorStop(1, "#FF0202");
    }

    sizeCanvases();

    function loop(){
      requestAnimationFrame(loop);
      //draw the meter level
      drawMeter();
    }

    loop();

    if (this.part)
      this.drawNotes();
  },

  drawNotes: function(){

    var notes = 127;
    var noteWidth16th = 2;
    var noteHeight = 20;

    var barWidth = 50;
    var beatWidth = barWidth / Tone.Transport.timeSignature;
    var sixteenthWidth = beatWidth / 4;

    var containerWidth = (this.domNode.width() - this.head.width() - 45) * 25;

    this.notesCanvas = $("<canvas>",{ "class" : "notes" }).appendTo(this.notesContainer);

    this.notesCanvas.get(0).width = containerWidth;
    this.notesCanvas.get(0).height = notes * noteHeight;

    var ctx = this.notesCanvas.get(0).getContext("2d");
    //context.fillStyle = "green";

    for (var i = 0; i < notes; i++){
      ctx.beginPath();
      ctx.moveTo(0, i*noteHeight);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'dimgray';
      ctx.lineTo(containerWidth, i*noteHeight);
      ctx.stroke();
    }

    for (var i = 0; i < this.part._events.length; i++){
      var note = this.part._events[i];

      var noteTime = new Tone.TransportTime(note.value.time);
      var time = noteTime.toBarsBeatsSixteenths();

      var bars = parseInt(time.split(':')[0]);
      var beats = parseInt(time.split(':')[1]);
      var sixteents = parseInt(time.split(':')[2]);
      var ticks = parseInt(time.split(':')[3]);

      var y = note.value.midi * noteHeight;
      var x = bars * barWidth;

      console.log(x, y, x + noteWidth16th, y + noteHeight);

      ctx.beginPath();
      ctx.rect(x, y, x + noteWidth16th, y + noteHeight);
      ctx.fillStyle = getRandomColor();
      ctx.fill();

//
//      var x = note.value.time * 5;
//      var y = note.value.midi;
//      ctx.fillRect(x, y, x + noteWidth, y + noteHeight);
//      return;
    }
  },

  toggleArmed: function(){
    this.armed = !this.armed;
  },

  isArmed: function(){
    return this.armed;
  },

  play: function(){
    if (this.part)
      this.part.start();
  },

  stop: function(){
    if (this.part)
      this.part.stop();

    for (var i = 0; i < this.instruments.length; i++){
      var instrument = this.instruments[i];
      instrument.releaseAll();
    }
  },

  init: function(){
    this.armed = false;

    this.domNode = $("<div class='track'></div>").addClass(this.type);
    this.addHead();

    if (this.type == TrackType.MIDI)
      this.addArmButton();
  },

  addHead: function(){
    this.head = $("<div class='head'></div>");
    this.domNode.append(this.head);
    var self = this;

    this.notesContainer = $("<div class='notes-container'></div>");
    this.domNode.append(this.notesContainer);

    this.top = $("<div class='top'></div>");
    this.head.append(this.top);

    this.btnEnabled = $("<div class='btn btn-enabled'>" + this.id + "</div>");
    this.top.append(this.btnEnabled);

    this.label = $("<div class='label'></div>");
    this.label.html(this.name);
    this.top.append(this.label);

    this.label.on("click", function(){
      $(".track").removeClass("selected");
      self.domNode.addClass("selected");
    });

    this.automationMenu = new Dropdown({
      name: "Auto",
      gain: {}
    });

    this.head.append(this.automationMenu.domeNode);
  },

  addArmButton: function(){
    var self = this;
    var btnArm = this.btnArm = $("<div class='btn btn-armed'>●</div>");
    this.btnArm.on("click", function(e){
      self.toggleArmed();
      $(btnArm).toggleClass("armed", self.isArmed());
    });
    this.top.append(this.btnArm);
  }
};

var ArmableTrack = function(){};
ArmableTrack.prototype = Object.assign({}, Track.prototype);

/**
 * Contains tracks and various method for track querying.
 * @author John Huijbers
 */
var TrackContainer = function(){
};

TrackContainer.prototype = {
  tracks: [],
  trackCount: 0,

  init: function(){
    this.domNode = $(".track-container");
  },

  forEach: function(cb){
    this.tracks.forEach(function(t){
      cb.bind(t)(t);
    });
  },

  add: function(type, track){
    var c = new Track(this.trackCount++, type, track );
    c.init();
    c.domNode.appendTo(this.domNode);
    this.tracks.push(c);
    c.startup();
  }
};

/**
 * Main application object
 *
 * @author John Huijbers
 */
var App = {
  tracks: null,

  init: function(){
    this.midi = MidiConvert.create();
    this.tracks = new TrackContainer();
    this.tracks.init();

    this.tracks.add(TrackType.Bus);
    this.tracks.add(TrackType.Bus);

    this.initTransport();
    this.initKeyboard();
    this.initMenu();

    this.loadProject("track.mid");
  },

  play: function(){
    $(".main-window").addClass("playing");
    console.log("Transport: Play");
    this.tracks.forEach(function(){
      this.play();
    });
    Tone.Transport.position = 0;
    Tone.Transport.start(0);
  },

  stop: function(){
    $(".main-window").removeClass("playing");
    console.log("Transport: Stop");
    this.tracks.forEach(function(){
      this.stop();
    });
    Tone.Transport.position = 0;
    Tone.Transport.stop(0);
  },

  loadProject: function(file){
    MidiConvert.load(file, this.importMidi.bind(this));
  },

  importMidi: function(midi) {
    // make sure you set the tempo before you schedule the events
    Tone.Transport.bpm.value = midi.header.bpm;
    Tone.Transport.timeSignature = midi.header.timeSignature;

    for (var i = 0; i < midi.tracks.length; i++){
      this.tracks.add(TrackType.MIDI, midi.tracks[i]);
    }
  },

  initTransport: function(){
    this.transportNode = $(".transport");

    this.slider = new Interface.Slider({
      tone : Tone.Master,
      param : "volume",
      name : "",
      max : 20,
      min : -30,
      parent: this.transportNode
    });

    this.btnPlay = $("<div class='btn btn-play'>►</div>").appendTo(this.transportNode);
    this.btnPlay.click(this.play.bind(this));

    this.btnStop = $("<div class='btn btn-stop'>■</div>").appendTo(this.transportNode);
    this.btnStop.click(this.stop.bind(this));
  },

  initMenu: function(){
    this.menuNode = $("#main-menu");

    var fileDropdown = new Dropdown({
      name: "File",
      actions: {
        "New...": function(){},
        "Open...": function(){},
        "Save as...": function(){},
        "Save": function(){},
        "Exit": function(){}
      }
    });

    this.menuNode.append(fileDropdown.domNode);

    var editDropdown = new Dropdown({
      name: "Edit",
      actions: {
        "New...": function(){},
        "Open...": function(){},
        "Save as...": function(){},
        "Save": function(){},
        "Exit": function(){}
      }
    });

    this.menuNode.append(editDropdown.domNode);

    var createDropdown = new Dropdown({
      name: "Create",
      bind: this,
      actions: {
        "Midi Track": function(){
          App.tracks.add(TrackType.MIDI, App.midi.track());
        },
        "Audio Track": function(){
          App.tracks.add(TrackType.Audio);
        }
      }
    });

    this.menuNode.append(createDropdown.domNode);

    var viewDropdown = new Dropdown({
      name: "View",
      actions: {
        "New...": function(){},
        "Open...": function(){},
        "Save as...": function(){},
        "Save": function(){},
        "Exit": function(){}
      }
    });

    this.menuNode.append(viewDropdown.domNode);
  },

  initKeyboard: function(){
    var keyboard = new QwertyHancock({
      id: "keyboard",
      width: $("#keyboard").parent().width(),
      height: 150,
      octaves: 6,
      startNote: "C1",
      whiteKeyColour: "white",
      blackKeyColour: "black",
      hoverColour: "#1EDF3E",
      activeColour : "#ED33CF"
    });

    keyboard.keyDown = this.onKeyDown.bind(this);
    keyboard.keyUp = this.onKeyUp.bind(this);
  },

  onKeyDown: function(note, frequency){
    this.tracks.forEach(function(track){
      if (this.armed){
        track.instruments.forEach(function(instrument){
          instrument.triggerAttackRelease(frequency, 0.25);
        })

      }
    });
  },

  onKeyUp: function (){
    this.tracks.forEach(function(track){
      if (track.armed){
        track.instruments.forEach(function(instrument){
          instrument.triggerRelease();
        })
      }
    });
  }
};

var Dropdown = function(options){
  this.domNode = $("<div class='dropdown'></div>");
  this.actions = [];

  var toggleButton = $("<button class='dropbtn'>" + options.name + "</button>").appendTo(this.domNode);
  var contentPanel = $("<div class='dropdown-content'></div>").appendTo(this.domNode);

  var toggleVisibile = function() {
    $('.dropdown-content').not(contentPanel).removeClass("show");
    contentPanel.toggleClass("show");

    $(document).one("click", function(e){
      contentPanel.removeClass("show");
    });

    return false;
  };

  for (var i in options.actions){
    var actionCallback = options.actions[i];
    var actionButton = $("<a>" + i + "</a>").click((function(cb){
      return function(){
        cb();
        toggleVisibile();
      };
    })(actionCallback));
    contentPanel.append(actionButton);
  }

  toggleButton.on("click", toggleVisibile);
};

$(App.init.bind(App));