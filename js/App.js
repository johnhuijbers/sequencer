define([
  "Tone",
  "MidiConvert",
  "./TrackContainer",
  "./TrackType",
  "./Interface",
  "./Transport"
], function(
  Tone,
  MidiConvert,
  TrackContainer,
  TrackType,
  Interface,
  Transport
){
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

      this.initTransport();
      this.initKeyboard();
      this.initMenu();

      this.loadProject("track.mid");
    },

    loadProject: function(file){
      MidiConvert.load(file, this.importMidi.bind(this));
    },

    importMidi: function(midi) {
      Tone.Transport.bpm.value = midi.header.bpm;
      Tone.Transport.timeSignature = midi.header.timeSignature;
      Tone.Transport.PPQ = midi.header.PPQ;

      for (var i = 0; i < midi.tracks.length; i++){
        this.tracks.add(TrackType.MIDI, midi.tracks[i]);
      }
    },

    initTransport: function(){
      this.transport = new Transport();
    },

    initMenu: function(){
      this.menuNode = $("#main-menu");

      var fileDropdown = new Interface.Dropdown({
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

      var editDropdown = new Interface.Dropdown({
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

      var createDropdown = new Interface.Dropdown({
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

      var viewDropdown = new Interface.Dropdown({
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
          track.instrument.source.triggerAttack(frequency);
        }
      });
    },
    onKeyUp: function (){
      this.tracks.forEach(function(track){
        if (track.armed){
          track.instrument.source.releaseAll();
        }
      });
    }
  };

  window.App = App;
  return App;
});
