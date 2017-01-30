define([
  "Tone",
  "StartAudioContext",
  "./Interface"
], function(
  Tone,
  StartAudioContext,
  Interface
){
  var Transport = function(){
    this.transportNode = $(".transport");

    this.slider = new Interface.Slider({
      tone : Tone.Master,
      param : "volume",
      name : "",
      max : 20,
      min : -30,
      parent: this.transportNode
    });

    StartAudioContext(Tone.context, ".btn-play");

    this.btnPlay = $("<div class='btn btn-play'>►</div>").appendTo(this.transportNode);
    this.btnPlay.click(this.play.bind(this));

    this.btnStop = $("<div class='btn btn-stop'>■</div>").appendTo(this.transportNode);
    this.btnStop.click(this.stop.bind(this));
  };

  Transport.prototype = {
    play: function(){
      $(".main-window").addClass("playing");
      App.tracks.forEach(function(){
        this.play();
      });
      Tone.Transport.position = 0;
      Tone.Transport.start(0);
    },

    stop: function(){
      $(".main-window").removeClass("playing");
      App.tracks.forEach(function(){
        this.stop();
      });
      Tone.Transport.position = 0;
      Tone.Transport.stop(0);
    }
  };

  return Transport;
});