define([
  "Tone",
  "jquery",
  "./Interface"
],function(
  Tone,
  $,
  Interface
){
  var Synth = function(){
    this.volume = new Tone.Volume(-6);
    this.filter = new Tone.Filter(6000, "lowpass", "-24");
    this.source = new Tone.PolySynth(2, Tone.Synth, {
      envelope: {
        attack : 0,
        decay : 0.2,
        sustain: 0,
        release: 0
      }
    });

    this.filter.connect(this.volume);
    this.source.connect(this.filter);
  };

  Synth.prototype = {
    playPart: function(time, note) {
      if (App.playing){
        this.source.triggerAttackRelease(
          note.name,
          note.duration,
          time,
          note.velocity
        );
      }
    },
    createUI: function(){
      this.domNode = $("<div />").addClass("synth");

      for (var i = 0; i < this.source.voices.length; i++){
        var voice = this.source.voices[i];

        for (var param in voice){
          var val = voice[param];
          if (val instanceof Tone.Param){
            new Interface.Slider({
              name: param,
              tone: voice,
              param: param,
              min: -100,
              max: 100,
              parent: this.domNode
            });
          }
        }
      }
    }
  };

  return Synth;
});