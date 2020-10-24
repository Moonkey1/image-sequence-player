function ImageSequencePlayer(settings) {

	// Set the container which was passed in to position: relative so everything holds its shape
	var $container = $(settings.selector);
	if ($container.css("position") == "static") $container.css("position", "relative");

	// The base of our player. Width of parent while holding correct aspect ratio for normal sized images
	var $player = $("<div>").addClass("isp-player").appendTo($container);
	$player.css("padding-top", (settings.normal.height / settings.normal.width * 100) + "%");


	// Load the images from video. Cut into normal and large frames
	var loadBar = createLoadBar($player);
	loadImages(settings, function(progress) {
		loadBar.setProgress(progress);
	}, function(normalImages, largeImages) {
		loadBar.remove();
		initPlayer(normalImages, largeImages);
	})

	// Everything is loaded - begin the player
	function initPlayer(normalImages, largeImages) {

		// Add the images to their containers
		var $imageContainer = $("<div>").addClass("isp-image-container").appendTo($player);
		$.each(normalImages, function(index, image) {
			if (index !== 0) $(image).addClass("isp-hidden");
			$imageContainer.append(image);
		});
		var $zoomContainer = $("<div>").addClass("isp-image-container-large").appendTo($player).hide();
		var zoomImage = new Image();
		$zoomContainer.append(zoomImage);


		// Create controls
		var $controls = $("<div>").addClass("isp-controls").appendTo($player);
		var $playButton = $("<div>").addClass("isp-controls-pause").appendTo($controls);
		var $prevButton = $("<div>").addClass("isp-controls-prev").appendTo($controls);
		var $nextButton = $("<div>").addClass("isp-controls-next").appendTo($controls);
		var $zoomButton = $("<div>").addClass("isp-controls-zoom-in").appendTo($controls);
		var $fullscreenButton = $("<div>").addClass("isp-controls-fullscreen").appendTo($controls);

		// State
		var playing = true;
		var playInterval = undefined;
		var currentFrame = 0;
		var zoomedIn = false;
		var fullscreen = false;
		
		// Drag state
		var dragging = false;
		var wasPlaying = true;
		var mouse = { x: 0, y: 0 }
		var currentPositionX;
		var currentPositionY;


		// Initialize jquery panzoom
		$zoomContainer.panzoom({
			minScale: 1,
			maxScale: settings.maxZoom,
			contain: 'invert',
			panOnlyWhenZoomed: true,
		}).panzoom();

		// Handlers
		$playButton.click(function() {
			if (playing) {
				pause();
				showPlayButton();
			} else {
				play();
				showPauseButton();
			}
		});
		$prevButton.click(function() {
			pause();
			showPlayButton();
			prevFrame();
		});
		$nextButton.click(function() {
			pause();
			showPlayButton();
			nextFrame();
		});
		$zoomButton.click(function() {
			if (zoomedIn) {
				pause();
				showPlayButton();
				revealTimelineControls();
				zoomOut();
				showZoomInButton();
			} else {
				pause();
				showPlayButton();
				hideTimelineControls();
				zoomIn();
				showZoomOutButton();
			}				
		});
		$fullscreenButton.click(function() {
			if (fullscreen) exitFullscreen();
			else goFullscreen();
		});


		








		$imageContainer.css("cursor", "-webkit-grab");
		$imageContainer.css("cursor", "grab");

		$imageContainer.on("mousedown touchstart", function(event) {
			if (fullscreen) return;

			event.preventDefault();
	
			$imageContainer.css("cursor", "-webkit-grabbing");
			$imageContainer.css("cursor", "grabbing");
	
			wasPlaying = playing;
			pause();
	
			if (event.type === "touchstart") {
				var event = event || window.event;
				var touches = event.touches || event.originalEvent.touches;
	
				if (touches.length === 1) {
					currentPositionX = touches[0].pageX;
					currentPositionY = touches[0].pageY;
				} else if (touches.length === 2) {
					var dx = touches[0].pageX - touches[1].pageX;
					var dy = touches[0].pageY - touches[1].pageY;
					touchZoomDistanceEnd = touchZoomDistanceStart = Math.sqrt(dx * dx + dy * dy);
				}
			} else {
				currentPositionX = event.pageX;
				currentPositionY = event.pageY;
			}
	
			var offset = $(this).offset();
	
			var posRelativeX = event.pageX - offset.left;
			var posRelativeY = event.pageY - offset.top;
			if (event.type === "touchstart") {
				posRelativeX = touches[0].pageX - offset.left;
				posRelativeY = touches[0].pageY - offset.top;
			}	
	
			dragging = true;
		});
	
		$imageContainer.on("mouseup touchend /*mouseout*/", function (event) {
			$imageContainer.css("cursor", "-webkit-grab");
			$imageContainer.css("cursor", "grab");
	
			if (dragging && !playing) {
				dragging = false;
	
				if (wasPlaying) play();
				else pause();
			}	
		});
	
		$imageContainer.on("mousemove touchmove", function(event) {
			var offset = $(this).offset();
	
			var posRelativeX = event.pageX - offset.left;
			var posRelativeY = event.pageY - offset.top;
	
			if (event.type === "touchmove") {
				var eventTouch = event || window.event;
				var touchesEv = eventTouch.touches || eventTouch.originalEvent.touches;
	
				posRelativeX = touchesEv[0].pageX - offset.left;
				posRelativeY = touchesEv[0].pageY - offset.top;
			}
	
			mouse.x = posRelativeX;
			mouse.y = posRelativeY;
	
			if (dragging) {
				var xPosition;
				var yPosition;
	
				$imageContainer.css("cursor", "-webkit-grabbing");
				$imageContainer.css("cursor", "grabbing");
	
				if (event.type === "touchmove") {	
					var event = event || window.event;
					var touches = event.touches || event.originalEvent.touches;
	
					if (touches.length === 1) {

						xPosition = touches[0].pageX;
						yPosition = touches[0].pageY;

					} else if (touches.length === 2) {

						/*
						var dx = touches[0].pageX - touches[1].pageX;
						var dy = touches[0].pageY - touches[1].pageY;
	
						touchZoomDistanceEnd = Math.sqrt(dx * dx + dy * dy);
	
						var factor = touchZoomDistanceStart / touchZoomDistanceEnd;
						touchZoomDistanceStart = touchZoomDistanceEnd;
	
						if (touchZoomDistanceEnd > zoomTouchDistanceOld) {
							valueZoom += stepPinchZoom;
							valueZoom = (valueZoom>maxZoom) ? maxZoom : valueZoom;
						} else {
							valueZoom -= stepPinchZoom;
							valueZoom = (valueZoom<minZoom) ? minZoom : valueZoom;
						}
	
						if (valueZoom <= maxZoom && valueZoom >= minZoom) {
							//document.getElementById("log").innerHTML = valueZoom;
// TODO							doZoom1(false, "", "", false);
						}
	
						if (valueZoom < 1.1) {
// TODO							exitZoom(false);
						}
	
						zoomTouchDistanceOld = touchZoomDistanceEnd;
						*/
					}

				} else {

					xPosition = event.pageX;
					yPosition = event.pageY;

				}
	
				//if (!isInertiaEnabled) {
					if (Math.abs(currentPositionX - xPosition) >= settings.dragSensitivity) {
						if (currentPositionX - xPosition >= settings.dragSensitivity) {
							if (settings.dragReversed) prevFrame();
							else nextFrame();
						} else {
							if (settings.dragReversed) nextFrame();
							else prevFrame();
						}
	
						currentPositionX = xPosition;
					}
				//}

			}
		});

		





























		function showPlayButton() {
			$playButton.removeClass("isp-controls-pause").addClass("isp-controls-play");
		}
		function showPauseButton() {
			$playButton.removeClass("isp-controls-play").addClass("isp-controls-pause");				
		}
		function showZoomInButton() {
			$zoomButton.removeClass("isp-controls-zoom-out").addClass("isp-controls-zoom-in");
		}
		function showZoomOutButton() {
			$zoomButton.removeClass("isp-controls-zoom-in").addClass("isp-controls-zoom-out");
		}
		function hideTimelineControls() {
			$playButton.css("visibility", "hidden");
			$prevButton.css("visibility", "hidden");
			$nextButton.css("visibility", "hidden");
		}
		function revealTimelineControls() {
			$playButton.css("visibility", "visible");
			$prevButton.css("visibility", "visible");
			$nextButton.css("visibility", "visible");
		}


		// Begin
		play();



		function play() {
			playing = true;
			playInterval = setInterval(playFrame, 1000 / settings.fps);
		}
		function pause() {
			playing = false;
			if (playInterval) clearInterval(playInterval);
			playInterval= undefined;
		}
		function zoomIn() {
			zoomedIn = true;
			$zoomContainer.show().panzoom('zoom', settings.maxZoom, { animate: false });
			$imageContainer.hide();
			zoomImage.src = largeImages[currentFrame].src;
		}
		function zoomOut() {
			zoomedIn = false;
			$zoomContainer.hide().panzoom("reset", { animate: false });
			$imageContainer.show();
		}
		function playFrame() {
			if (settings.playReversed) prevFrame();
			else nextFrame();
		}
		function prevFrame() {
			var beforeImage = normalImages[currentFrame];
			$(beforeImage).addClass("isp-hidden");
			currentFrame = (currentFrame + settings.frames - 1) % settings.frames;
			var afterImage = normalImages[currentFrame];
			$(afterImage).removeClass("isp-hidden");
		}
		function nextFrame() {
			var beforeImage = normalImages[currentFrame];
			$(beforeImage).addClass("isp-hidden");
			currentFrame = (currentFrame + 1) % settings.frames;
			var afterImage = normalImages[currentFrame];
			$(afterImage).removeClass("isp-hidden");
		}
		function goFullscreen() {
			var element = $player[0];
			if (element.requestFullscreen) {
				element.requestFullscreen();
			} else if (element.webkitRequestFullscreen) { /* Safari */
				element.webkitRequestFullscreen();
			} else if (element.msRequestFullscreen) { /* IE11 */
				element.msRequestFullscreen();
			}
			fullscreen = true;
		}
		function exitFullscreen() {
			if (document.exitFullscreen) {
				document.exitFullscreen();
			} else if (document.webkitExitFullscreen) {
				document.webkitExitFullscreen();
			} else if (document.mozCancelFullScreen) {
				document.mozCancelFullScreen();
			} else if (document.msExitFullscreen) {
				document.msExitFullscreen();
			}				
		}
	}


// Load bar object. Handles its own markup. setProgress(progress) to update it
function createLoadBar($parent) {
	var $loadBar = $("<div>").addClass("isp-load-bar").appendTo($parent);
	var $content = $("<div>").addClass("isp-load-bar-content").appendTo($loadBar);

	var $title = $("<div>").addClass("isp-load-bar-title").text("Loading").appendTo($content);
	var $barContainer = $("<div>").addClass("isp-load-bar-bar-container").appendTo($content);
	var $bar = $("<div>").addClass("isp-load-bar-bar").appendTo($barContainer);
	var $percent = $("<div>").addClass("isp-load-bar-percent").appendTo($content);

	function setProgress(progress) {
		$bar.css("width", (progress * 100) + "%");
		$percent.text(Math.round(progress * 100) + "%");
	}

	function remove() {
		$loadBar.remove();
	}

	setProgress(0);

	return {
		$loadBar: $loadBar,
		setProgress: setProgress,
		remove: remove,
	}
}


// Load images based on a settings object. Callbacks for progress and lists of normal & large sized image sequences
function loadImages(settings, progressCallback, completionCallback) {
	var video = document.createElement("video");
	video.preload = "auto";
	video.autoplay = true;
	video.muted = true;
	video.setAttribute("playsinline", "");

	var normalImages = [];
	var largeImages = [];

	var nextFrame = 0;

	video.addEventListener('loadeddata', function() {
		generateNextFrame();
	}, false);
	video.src = settings.video;


	function generateNextFrame() {
		video.currentTime = ((nextFrame + 1) / settings.frames) * video.duration;
	}
	video.addEventListener("seeked", function() {

		normalImages.push(createFrameImage(settings.normal.width, settings.normal.height));
		largeImages.push(createFrameImage(settings.large.width, settings.large.height));

		if (progressCallback) progressCallback((nextFrame + 1) / settings.frames);

		nextFrame++;
		if (nextFrame >= settings.frames) {
			allImagesGenerated();
		} else {
			generateNextFrame();
		}
	});

	function createFrameImage(width, height) {
		var canvas = document.createElement("canvas");
		var ctx = canvas.getContext("2d");

		canvas.width = width;
		canvas.height = height;
		ctx.drawImage(video, 0, 0, width, height);

		var data = canvas.toDataURL("image/jpeg");

		var img = new Image();
		img.src = data;
		return img;
	}

	function allImagesGenerated() {
		if (completionCallback) completionCallback(normalImages, largeImages);
	}

}


}




