define([
  "Tone",
  "jquery",
  "./TrackType",
  "./SubtractorSynth",
  "./Interface"
], function(
  Tone,
  $,
  TrackType,
  Synth,
  Interface
){
  var percentColors = [
    { pct: 0.0, color: { r: 0xff, g: 0xff, b: 0xff } },
    { pct: 1.0, color: { r: 0xff, g: 0x00, b: 0x00 } } ];

  var getColorForPercentage = function(pct) {
    for (var i = 1; i < percentColors.length - 1; i++) {
      if (pct < percentColors[i].pct) {
        break;
      }
    }
    var lower = percentColors[i - 1];
    var upper = percentColors[i];
    var range = upper.pct - lower.pct;
    var rangePct = (pct - lower.pct) / range;
    var pctLower = 1 - rangePct;
    var pctUpper = rangePct;
    var color = {
      r: Math.floor(lower.color.r * pctLower + upper.color.r * pctUpper),
      g: Math.floor(lower.color.g * pctLower + upper.color.g * pctUpper),
      b: Math.floor(lower.color.b * pctLower + upper.color.b * pctUpper)
    };
    return 'rgb(' + [color.r, color.g, color.b].join(',') + ')';
    // or output as hex if preferred
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
        this.drawNoteEditor();
    },

    createCanvas: function(){
      this.midiDuration = new Tone.TransportTime(this.midi.duration);
      this.barCount = parseInt(this.midiDuration.toBarsBeatsSixteenths().split(':')[0])+1;
      this.beatCount = this.barCount * Tone.Transport.timeSignature;
      this.noteCount = 127;

      this.noteHeight = 5;
      this.barWidth = 200;
      this.beatWidth = this.barWidth / Tone.Transport.timeSignature;
      this.tickWidth = this.beatWidth / Tone.Transport.PPQ;

      this.containerWidth = (this.domNode.width() - this.head.width() - 45) * 25;
      this.containerHeight = this.noteCount * this.noteHeight;

      this.notesCanvas = $("<canvas>", { "class" : "notes" }).appendTo(this.contentContainer).bind('contextmenu', function(e){
        return false;
      });
      this.notesCanvas.get(0).width = this.containerWidth;
      this.notesCanvas.get(0).height = this.containerHeight;
      this.noteStage = new createjs.Stage(this.notesCanvas.get(0));
    },

    drawGuideLines: function(){
      for (var y = 0; y <= this.noteCount; y++){
        var lineX = new createjs.Shape();
        lineX.graphics.setStrokeStyle(1)
          .beginStroke("dimgray")
          .moveTo(0, y*this.noteHeight)
          .lineTo(this.containerWidth, y*this.noteHeight);
        this.noteStage.addChild(lineX);

        for (var x = 0; x <= this.barCount; x++){
          var lineY = new createjs.Shape();
          lineY.graphics.setStrokeStyle(1)
            .beginStroke("dimgray")
            .moveTo(x * this.barWidth, 0)
            .lineTo(x * this.barWidth, this.containerHeight);
          this.noteStage.addChild(lineY);
        }

        for (var x = 0; x <= this.beatCount; x++){
          var lineY = new createjs.Shape();
          lineY.graphics.setStrokeStyle(1)
            .beginStroke("dimgray")
            .moveTo(x * this.beatWidth, 0)
            .lineTo(x * this.beatWidth, this.containerHeight);
          this.noteStage.addChild(lineY);
        }
      }
    },

    drawNote: function(note){
      var noteTime = new Tone.TransportTime(note.value.time);
      var noteDuration = new Tone.TransportTime(note.value.duration);

      var noteShape = new createjs.Shape();

      var _this = this;
      var selected = false;
      var drawShape = function(){
        noteShape.graphics.clear().setStrokeStyle(1)
          .beginStroke("black")
          .beginFill(getColorForPercentage(note.value.velocity))
          .drawRect(
            noteTime.toTicks() * _this.tickWidth,
            ((127 - note.value.midi) * _this.noteHeight) - _this.noteHeight,
            noteDuration.toTicks() * _this.tickWidth,
            _this.noteHeight
          );
      };

      drawShape();
      this.noteStage.addChild(noteShape);

      noteShape.on("pressmove", function(evt) {
        evt.target.x = evt.stageX;
        evt.target.y = evt.stageY;
        drawShape();
        _this.drawStage();
      });
      noteShape.on("pressup", function(evt) { console.log("up"); })

      note.shape = noteShape;
    },

    drawNotes: function(){
      for (var i = 0; i < this.part._events.length; i++){
        var note = this.part._events[i];
        this.drawNote(note);
      }
    },

    drawStage: function(){
      this.noteStage.update();
    },

    drawNoteEditor: function(){
      this.createCanvas();
      this.drawGuideLines();
      this.drawNotes();
      this.drawStage();
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

      if (this.instrument && this.instrument.source)
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

        this.part = new Tone.Part(this.instrument.playPart.bind(this.instrument), this.midi.notes);
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