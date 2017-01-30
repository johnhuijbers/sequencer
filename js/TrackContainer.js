define([
  "jquery",
  "./Track"
], function(
  $,
  Track
){
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

  return TrackContainer;
});