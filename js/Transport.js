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
    this.playContainerNode = $("<div class='play-menu'></div>").appendTo(this.transportNode);
    this.slidersNode = $("<div class='sliders'></div>").appendTo(this.transportNode);

    this.slider = new Interface.Slider({
      tone : Tone.Master,
      param : "volume",
      name : "masterVolume",
      max : 20,
      min : -30,
      parent: this.slidersNode
    });

    StartAudioContext(Tone.context, ".btn-play");

    this.btnSeekPrev = $("<div class='btn btn-seek btn-seek-prev'>≪</div>").appendTo(this.playContainerNode);
    this.btnSeekPrev.click(this.play.bind(this));

    this.btnPlay = $("<div class='btn btn-play'>►</div>").appendTo(this.playContainerNode);
    this.btnPlay.click(this.play.bind(this));

    this.btnStop = $("<div class='btn btn-stop'>■</div>").appendTo(this.playContainerNode);
    this.btnStop.click(this.stop.bind(this));

    this.btnSeekNext = $("<div class='btn btn-seek btn-seek-next'>≫</div>").appendTo(this.playContainerNode);
    this.btnSeekNext.click(this.play.bind(this));
  };

  Transport.prototype = {
    play: function(){
      App.playing = true;
      App.tracks.forEach(function(){
        this.play();
      });
      Tone.Transport.position = 0;
      Tone.Transport.start(0);

      this.toggleBodyState();
    },

    stop: function(){
      App.playing = false;
      App.tracks.forEach(function(){
        this.stop();
      });
      Tone.Transport.position = 0;
      Tone.Transport.stop(0);
      this.toggleBodyState();
    },

    toggleBodyState: function(){
      $("body").toggleClass("playing", App.playing);
    }
  };

  return Transport;
});