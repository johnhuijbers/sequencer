define([
  "Tone",
  "jquery",
  "./TrackType",
  "./Synth",
  "./Interface"
], function(
  Tone,
  $,
  TrackType,
  Synth,
  Interface
){
  function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  /**
   * Represents a single track. @see TrackType for available types
   *
   * @author John Huijbers
   */
  var Track = function(id, type, midi){
    this.id = id;
    this.type = type;
    this.name = midi ? midi.name ? midi.name : type + " track" : type + " track";
    this.midi = midi || App.midi.track();

    this.selected = false;

    this.chain = [];

    this.meter = new Tone.Meter("level");
    this.volume = new Tone.Volume(-6).connect(this.meter).toMaster();
  };

  Track.prototype = {
    startup: function(){
      if (this.type != TrackType.MIDI) return;

      this.slider = new Interface.Slider({
        tone : this.volume,
        param : "volume",
        name : "",
        max : 6,
        min : -40,
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

      this.notesCanvas = $("<canvas>",{ "class" : "notes" }).appendTo(this.contentContainer);

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

    toggleMute: function(){
      this.volume.mute = !this.volume.mute;
      this.setMuteButtonState();
    },

    setMuteButtonState: function(){
      this.btnEnabled.toggleClass("enabled", !this.volume.mute)
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

      this.instrument.source.releaseAll();
    },

    init: function(){
      this.armed = false;

      this.domNode = $("<div class='track'></div>").addClass(this.type);
      this.addHead();

      if (this.type == TrackType.MIDI){
        this.addArmButton();
      }

      if (this.type == TrackType.MIDI){
        this.initAudio();
        this.createInstrumentsPane();
      }
    },

    setupFXChain: function(){
      this.chain.push(new Tone.FeedbackDelay("8n", 0.5));
      this.chain.push(new Tone.MultibandCompressor({
        "lowFrequency" : 200,
        "highFrequency" : 1300,
        "low" : {
          "threshold" : -12
        }
      }));

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
    },

    setupInstrument: function(){
      this.instrument = new Synth();
      this.instrument.volume.connect(this.chain[0]);
    },

    initAudio: function(){
      if (this.type == TrackType.Audio){

      }
      else if (this.type == TrackType.MIDI){
        this.setupFXChain();
        this.setupInstrument();

        var partCallback = function(time, note) {
          this.instrument.source.triggerAttackRelease(note.name, note.duration, time, note.velocity);
        };

        this.part = new Tone.Part(partCallback.bind(this), this.midi.notes);
      }
    },

    createInstrumentsPane: function(){
      this.instrumentsPane = $("<div class='instruments' />").appendTo(this.contentContainer);
      this.instrument.createUI();
      this.instrument.domNode.appendTo(this.instrumentsPane);
    },

    toggleInstruments: function(){
      this.instrumentsPane.toggleClass("show");
    },

    addHead: function(){
      this.head = $("<div class='head'></div>");
      this.domNode.append(this.head);
      var self = this;

      this.contentContainer = $("<div class='content-container'></div>");
      this.domNode.append(this.contentContainer);

      this.top = $("<div class='top'></div>");
      this.head.append(this.top);

      this.btnEnabled = $("<div class='btn btn-enabled'>" + this.id + "</div>");
      this.btnEnabled.on("click", this.toggleMute.bind(this));
      this.setMuteButtonState();
      this.top.append(this.btnEnabled);

      this.label = $("<div class='label'></div>");
      this.label.html(this.name);
      this.top.append(this.label);

      this.label.on("click", function(){
        $(".track").removeClass("selected");
        self.domNode.addClass("selected");
      });

      if (this.type == TrackType.MIDI){
        this.btnInstrument = $("<div class='btn btn-instrument'>♪</div>");
        this.btnInstrument.on("click", this.toggleInstruments.bind(this));
        this.top.append(this.btnInstrument);
      }
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

  return Track;
});