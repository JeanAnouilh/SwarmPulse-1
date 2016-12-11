/*******************************************************************************
 *     SwarmPulse - A service for collective visualization and sharing of mobile 
 *     sensor data, text messages and more.
 *
 *     Copyright (C) 2015 ETH Zürich, COSS
 *
 *     This file is part of SwarmPulse.
 *
 *     SwarmPulse is free software: you can redistribute it and/or modify
 *     it under the terms of the GNU General Public License as published by
 *     the Free Software Foundation, either version 3 of the License, or
 *     (at your option) any later version.
 *
 *     SwarmPulse is distributed in the hope that it will be useful,
 *     but WITHOUT ANY WARRANTY; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *     GNU General Public License for more details.
 *
 *     You should have received a copy of the GNU General Public License
 *     along with SwarmPulse. If not, see <http://www.gnu.org/licenses/>.
 *
 *
 * 	Author:
 * 	Prasad Pulikal - prasad.pulikal@gess.ethz.ch  - Initial design and implementation
 *******************************************************************************/
$(document)
		.ready(
				function() {
					var DEBUG = true;
					var websocket;
					var counter = 0;
					var current_state = 0; // 0 - Real-Time, 1 - Time-Machine, 2 - Value-Picker
					var current_layer = -1;
					var last_layer = 0;
					var initialReq = true;// jhkjhkhkhk marker not clearing
											// check this initial implemnt

					var markerArray = [];
					var data = [];
					var map = L.map('map', {
						zoomControl : false
					}).setView([ 47.379977, 8.545751 ], 2);
					var lightMarkers = new L.LayerGroup();
					var noiseMarkers = new L.LayerGroup();
					var msgMarkers = new L.LayerGroup();
					var temperatureMarkers = new L.LayerGroup();
					var accelerometerMarkers = new L.LayerGroup();
					var gyroMarkers = new L.LayerGroup();

					new L.Control.Zoom({
						position : 'topright'
					}).addTo(map);

					var mapStandard = L
							.tileLayer(
									'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
									{
										attribution : '&copy; OpenStreetMap contributors, CC-BY-SA',
										maxZoom : 11
									});

					mapLink = '<a href="http://openstreetmap.org">OpenStreetMap</a>';
					mapquestLink = '<a href="http://www.mapquest.com//">MapQuest</a>';
					mapquestPic = '<img src="http://developer.mapquest.com/content/osm/mq_logo.png">';

					var mapSatellite = L
							.tileLayer(
									'http://otile{s}.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.png',
									{
										attribution : '&copy; ' + mapLink
												+ '. Tiles courtesy of '
												+ mapquestLink + mapquestPic,
										maxZoom : 11,
										subdomains : '1234',
									});

					var mapNoLabels = L
							.tileLayer(
									'https://cartocdn_{s}.global.ssl.fastly.net/base-midnight/{z}/{x}/{y}.png',
									{
										attribution : '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
										maxZoom : 11
									});

					var mapWithLabels = L
							.tileLayer(
									'http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
									{
										attribution : '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
										maxZoom : 11
									});

					/** ****Pulse Logo****** */
					var info = L.control({
						position : 'topleft'
					});

					info.onAdd = function(map) {
						this._div = L.DomUtil.create('div', 'info');
						this.update();
						return this._div;
					};

					// method that we will use to update the control based on
					// feature properties passed
					info.update = function(props) {
						this._div.style.fontSize = "90%"
						this._div.innerHTML = '<img align = "left" src=\'pulse_logo.png\' width=\'70px\' bgcolor=\'#FFFFFF\'> <p width=\'20%\' align: \'top\'  style=\'color: #FF770D; font-family: verdana; display:inline-block; vertical-align: -25px;\'>&nbsp;<b>mapping the world together</p><br>';

					};

					info.addTo(map);

					/** ******************************* */

					/** ***************Layer Control********************* */
					var baseMaps = {
						"Standard Map" : mapStandard,
						"Standard Map 2" : mapSatellite,
						"Dark no labels Map" : mapNoLabels,
						"Dark with labels Map" : mapWithLabels
					};

					var groupedOverlays = {
						"Overlays" : {

							"Messages" : msgMarkers,
							"Light" : lightMarkers,
							"Sound" : noiseMarkers,
							"Temperature" : temperatureMarkers,
							//"Acceleration" : accelerometerMarkers, TODO
							//"Gyroscope" : gyroMarkers

						}
					};

					var options = {
						exclusiveGroups : [ "Overlays" ],
						groupCheckboxes : true,
						position : 'topleft'
					};

					var layerControl = L.control.groupedLayers(baseMaps,
							groupedOverlays, options);

					map.addControl(layerControl);
				
					/** ***************Layer Control********************* */

					/** ********************************************************************* */

					/** *****Legend for Color levels for noise***** */
					var legendSound = L.control({
						position : 'bottomleft'
					});

					legendSound.onAdd = function(map) {
						var div = L.DomUtil.create('div', 'label');
						grades = [ 0, 10, 30, 50, 70, 100, 120, 140 ],
								labels = [ "  0-10  ", "10-30", "30-50",
										"50-70", "70-100", "100-120",
										"120-140", "   140+  " ];

						div.style.border = "1px solid #ffffff";
						div.style.borderRadius = "2px";
						div.style.backgroundColor = "#2A2A2A";
						div.style.color = "#ffffff";
						div.style.fontSize = "80%";
						div.innerHTML = '<p align: \'bottom\'  style=\'color: #FFFFFF;   display:inline-block;\'> Sound Level (db)</p>  <br>';

						for (var i = 0; i < grades.length; i++) {
							div.innerHTML += '<img align = "left"  width=\'10px\' height=\'10px\' style="background-color:'
									+ getNoiseColor(grades[i] + 1)
									+ '"> <p align: \'left\' style=\'color: #FFA500; display:inline-block; \'>'
									+ labels[i] + ' </p><br>';

						}
						return div;
					};
					/** ********** */

					/** *****Legend for showing Light label***** */
					var legendLight = L.control({
						position : 'bottomleft'
					});

					legendLight.onAdd = function(map) {

						var div = L.DomUtil.create('div', 'label');
						var lightGrades = [ 0, 1, 5, 10, 100, 1000, 10000,
								100000 ];
						var lightLabels = [ "0", "1-5", "6-10", "11-100",
								"101-1000", "1001-10000", " 10001-100000 ",
								"100001+" ];

						div.style.border = "1px solid #ffffff";
						div.style.borderRadius = "2px";
						div.style.backgroundColor = "#2A2A2A";
						div.style.color = "#ffffff";
						div.style.fontSize = "80%";
						div.innerHTML = '<p align: \'bottom\'  style=\'color: #FFFFFF;   display:inline-block;\'> Light Level (lux)&nbsp;&nbsp;&nbsp;&nbsp;</p><br>';

						for (var i = 0; i < lightGrades.length; i++) {

							div.innerHTML += '<div class="squaredThree left"><input type="checkbox" value="' + lightGrades[i] + 1 + '" id="squaredThree.' + lightGrades[i] + '" name="check' + lightGrades[i] + '" checked><label id= "lightCheckBox" for="squaredThree.' + lightGrades[i] + '" style="background-color:' + getLightColor(lightGrades[i] + 1) + '"></label>'
									//+ getLightColor(lightGrades[i] + 1)
									//+ '"> <p align: \'left\' style=\'color: #FFA500; display:inline-block; \'>'
									+ '<p align: \'left\' style=\'color: #FFA500; display:inline-block; \'>'
									+ lightLabels[i] + '</p></div>';

						}
						return div;
					};
					
					/** *****Legend for Color levels for acceleration***** */
					var legendAccelerometer = L.control({
						position : 'bottomleft'
					});

					legendAccelerometer.onAdd = function(map) {
						var div = L.DomUtil.create('div', 'label');
						grades = [ 0, 10, 30, 50, 70, 100, 120, 140 ],
								labels = [ "  0-10  ", "10-30", "30-50",
										"50-70", "70-100", "100-120",
										"120-140", "   140+  " ];

						div.style.border = "1px solid #ffffff";
						div.style.borderRadius = "2px";
						div.style.backgroundColor = "#2A2A2A";
						div.style.color = "#ffffff";
						div.style.fontSize = "80%";
						div.innerHTML = '<p align: \'bottom\'  style=\'color: #FFFFFF;   display:inline-block;\'> Acceleration Level</p>  <br>';

						for (var i = 0; i < grades.length; i++) {
							div.innerHTML += '<img align = "left"  width=\'10px\' height=\'10px\' style="background-color:'
									+ getAccelerometerColor(grades[i] + 1)
									+ '"> <p align: \'left\' style=\'color: #FFA500; display:inline-block; \'>'
									+ labels[i] + ' </p><br>';

						}
						return div;
					};
					
					/** *****Legend for Color levels for temperature***** */
					var legendTemperature = L.control({
						position : 'bottomleft'
					});

					legendTemperature.onAdd = function(map) {
						var div = L.DomUtil.create('div', 'label');
						grades = [ -30, -20, -10, 0, 10, 20, 30, 40 ],
								labels = [ "  < -20  ", "-20 - -10", "-10 - 0 ",
										"  0 - 10 ", " 10 - 20 ", " 20 - 30 ",
										" 30 - 40 ", "   40 <  " ];

						div.style.border = "1px solid #ffffff";
						div.style.borderRadius = "2px";
						div.style.backgroundColor = "#2A2A2A";
						div.style.color = "#ffffff";
						div.style.fontSize = "80%";
						div.innerHTML = '<p align: \'bottom\'  style=\'color: #FFFFFF;   display:inline-block;\'> Temperature Level</p>  <br>';

						for (var i = 0; i < grades.length; i++) {
							div.innerHTML += '<img align = "left"  width=\'10px\' height=\'10px\' style="background-color:'
									+ getTemperatureColor(grades[i] + 1)
									+ '"> <p align: \'left\' style=\'color: #FFA500; display:inline-block; \'>'
									+ labels[i] + ' </p><br>';

						}
						return div;
					};
					
					/** *****Legend for Color levels for gyroscope***** */
					var legendGyro = L.control({
						position : 'bottomleft'
					});

					legendGyro.onAdd = function(map) {
						var div = L.DomUtil.create('div', 'label');
						grades = [ 0, 10, 30, 50, 70, 100, 120, 140 ],
								labels = [ "  0-10  ", "10-30", "30-50",
										"50-70", "70-100", "100-120",
										"120-140", "   140+  " ];

						div.style.border = "1px solid #ffffff";
						div.style.borderRadius = "2px";
						div.style.backgroundColor = "#2A2A2A";
						div.style.color = "#ffffff";
						div.style.fontSize = "80%";
						div.innerHTML = '<p align: \'bottom\'  style=\'color: #FFFFFF;   display:inline-block;\'> Gyroscope Level</p>  <br>';

						for (var i = 0; i < grades.length; i++) {
							div.innerHTML += '<img align = "left"  width=\'10px\' height=\'10px\' style="background-color:'
									+ getGyroColor(grades[i] + 1)
									+ '"> <p align: \'left\' style=\'color: #FFA500; display:inline-block; \'>'
									+ labels[i] + ' </p><br>';

						}
						return div;
					};

					/** *************************** */
					/** ****************************** */
					var downloadAppButton = L.easyButton({
						states : [ {
							stateName : 'downloadApp',
							icon : 'fa-mobile fa-lg',
							title : 'Download Mobile App',
							onClick : function(control) {
								// control.state("connecting");
								// window.open("./Pulse.apk");
								showDialog();
							}
						} ],
						position : "topright"
					});

					downloadAppButton.addTo(map);
					/** ****************************** */
					/** ***********Server Connected Status Button**************** */
					var conButton = L.easyButton({
						states : [ {
							stateName : 'disconnected',
							icon : 'fa-chain-broken fa-lg',
							title : 'Server disconnected',
							onClick : function(control) {
								control.state("connecting");
								doConnect();
							}
						}, {
							stateName : 'connecting',
							icon : 'fa-spinner fa-lg fa-spin',
							title : 'connecting...'
						}, {
							stateName : 'connected',
							icon : 'fa-chain fa-lg',
							title : 'Server Connected'
						}, {
							stateName : 'error',
							icon : 'fa-exclamation-circle fa-lg',
							title : 'Error.'
						} ],
						position : "topright"
					});

					conButton.addTo(map);
					conButton.state('connecting');

					/** *************************** */
					/**
					 * ***********Real Time or Time Machine
					 * Button****************
					 */
					var realTimeButton = L
							.easyButton({
								states : [
										{
											stateName : 'realTime',
											icon : 'fa-clock-o fa-lg',
											title : 'Real-Time',
											onClick : function(control) {
												if (DEBUG) {
													console
															.log("******LOG*******Inside onClick realTime Button");
												}
												control.state("timeMachine");
												//$('valueSelectionButton').state("allValues");
												changeSocketToTimeMachine();

												resetBeforeSendingTimeMachineRequest();

												$('#valuePicker').hide(0);
												$('#datePicker').show(0);
											}
										},
										{
											stateName : 'timeMachine',
											icon : 'fa-history fa-lg',
											title : 'Time-Machine',
											onClick : function(control) {
												if (DEBUG) {
													console
															.log("******LOG*******Inside onClick timeMachine button");
												}
												control.state("realTime");

												if (current_layer == 0) {

													resetToMessagesOverlay();
													last_layer = 0;
												} else if (current_layer == 1) {

													resetToLightReadings();

													last_layer = 1;
												} else if (current_layer == 2) {

													resetToNoiseReadings();
													last_layer = 2;
												} else if (current_layer == 3) {

													resetToTemperatureReadings();
													last_layer = 3;
												} /*else if (current_layer == 4) { TODO

													resetToAccelerometerReadings();
													last_layer = 4;
												} else if (current_layer == 5) {

													resetToGyroReadings();
													last_layer = 5;
												}*/
												changeSocketToRealTime();

												$('#datePicker').hide(0);
											}
										} ],	
								position : "topright"

							});

					realTimeButton.addTo(map);
					realTimeButton.state('realTime');
					
					/** *************************** */
					/**
					 * ***********Value Selection or All Values
					 * Button****************
					 */
					var valueSelectionButton = L
							.easyButton({
								states : [
										{
											stateName : 'allValues',
											icon : 'fa-square-o fa-lg',
											title : 'Value-Selection',
											onClick : function(control) {
												if (DEBUG) {
													console
															.log("******LOG*******Inside onClick allValues Button");
												}
												//$('realTimeButton').state("realTime");
												control.state("valueSelection");
												changeSocketToValuePicker();

												resetBeforeSendingValueRequest();

												$('#datePicker').hide(0);
												$('#valuePicker').show(0);
											}
										},
										{
											stateName : 'valueSelection',
											icon : 'fa-check-square-o fa-lg',
											title : 'Value-Selection',
											onClick : function(control) {
												if (DEBUG) {
													console
															.log("******LOG*******Inside onClick valueSelection button");
												}
												control.state("allValues");

												if (current_layer == 0) {

													resetToMessagesOverlay();
													last_layer = 0;
												} else if (current_layer == 1) {

													resetToLightReadings();

													last_layer = 1;
												} else if (current_layer == 2) {

													resetToNoiseReadings();
													last_layer = 2;
												} else if (current_layer == 3) {

													resetToTemperatureReadings();
													last_layer = 3;
												} /*else if (current_layer == 4) { TODO

													resetToAccelerometerReadings();
													last_layer = 4;
												} else if (current_layer == 5) {

													resetToGyroReadings();
													last_layer = 5;
												}*/
												changeSocketToRealTime();

												$('#valuePicker').hide(0);
											}
										} ],	
								position : "topright"

							});

					valueSelectionButton.addTo(map);
					valueSelectionButton.state('valueSelection');

					/** *************************** */
					
					/** ****************************** */
					var daylightLayer = L.terminator();
					var daylightButton = L.easyButton({
						states : [ {
							stateName : 'showDaylightLayer',
							icon : 'fa-moon-o fa-lg',
							title : 'Show Daylight layer',
							onClick : function(control) {
								daylightLayer.addTo(map);
								control.state("hideDaylightLayerTime");
							}
						}, {
							stateName : 'hideDaylightLayerTime',
							icon : 'fa-moon-o',
							title : 'Hide Daylight layer',
							onClick : function(control) {
//								L.terminator().addTo(map);
								map.removeLayer(daylightLayer);
								control.state("showDaylightLayer");
							}
						}  ],
						position : "topright"
					});

					daylightButton.addTo(map);
					/** ****************************** */
				

					/** ****************************** */
					var infoButton = L.easyButton({
						states : [ {
							stateName : 'Information',
							icon : 'fa-info fa-lg .fa-info',
							title : 'About / Info',
							onClick : function(control) {
								showInfo();
							}
						} ],
						position : "bottomright"
					});

					infoButton.addTo(map);
					/** ****************************** */
					/** ****************************** */
					var helpButton = L.easyButton({
						states : [ {
							stateName : 'Help',
							icon : 'fa-question fa-lg',
							title : 'Help / FAQ',
							onClick : function(control) {
								showHelp();
							}
						} ],
						position : "bottomright"
					});

					helpButton.addTo(map);
					/** ****************************** */
					/** ********** */

					mapStandard.addTo(map);
					map
						.on(
							'overlayadd',
							function(a) {
								if (a.name == "Light"
										&& current_layer != 1) {
									resetToLightReadings();
									last_layer = 1;

									hideSpinner();
									if (current_state == 0) {

										initialReq = true;
										makeInitialRequest();
									}
									$('#statusmsgs')
											.html(
													'<p style="text-align:center;"><span style="font-family:Helvetica;font-size:16px;font-style:normal;font-weight:bold;text-decoration:none;text-transform:uppercase;color:FFFFFF;">LIGHT</span></p>');

								} else if (a.name == "Sound"
										&& current_layer != 2) {

									resetToNoiseReadings();
									last_layer = 2;
									$('#statusmsgs')
											.html(
													'<p style="text-align:center;"><span style="font-family:Helvetica;font-size:16px;font-style:normal;font-weight:bold;text-decoration:none;text-transform:uppercase;color:FFFFFF;">SOUND</span></p>');

									hideSpinner();
									if (current_state == 0) {

										initialReq = true;
										makeInitialRequest();
									}
								} else if (a.name == "Messages"
										&& current_layer != 0) {

									// current_layer = 2;
									resetToMessagesOverlay();
									last_layer = 0;
									$('#statusmsgs')
											.html(
													'<p style="text-align:center;"><span style="font-family:Helvetica;font-size:16px;font-style:normal;font-weight:bold;text-decoration:none;text-transform:uppercase;color:FFFFFF;">MESSAGES</span></p>');
									hideSpinner();
									if (current_state == 0) {

										initialReq = true;
										makeInitialRequest();
									}

								} /*else if (a.name == "Acceleration" TODO
										&& current_layer != 4) {

									resetToAccelerometerReadings();
									last_layer = 4;
									$('#statusmsgs')
											.html(
													'<p style="text-align:center;"><span style="font-family:Helvetica;font-size:16px;font-style:normal;font-weight:bold;text-decoration:none;text-transform:uppercase;color:FFFFFF;">ACCELERATION</span></p>');
									hideSpinner();
									if (current_state == 0) {

										initialReq = true;
										makeInitialRequest();
									}

								} else if (a.name == "Gyroscope"
										&& current_layer != 5) {

									resetToGyroReadings();
									last_layer = 5;
									$('#statusmsgs')
											.html(
													'<p style="text-align:center;"><span style="font-family:Helvetica;font-size:16px;font-style:normal;font-weight:bold;text-decoration:none;text-transform:uppercase;color:FFFFFF;">GYROSCOPE</span></p>');
									hideSpinner();
									if (current_state == 0) {

										initialReq = true;
										makeInitialRequest();
									}

								} */else if (a.name == "Temperature"
										&& current_layer != 3) {

									resetToTemperatureReadings();
									last_layer = 3;
									$('#statusmsgs')
											.html(
													'<p style="text-align:center;"><span style="font-family:Helvetica;font-size:16px;font-style:normal;font-weight:bold;text-decoration:none;text-transform:uppercase;color:FFFFFF;">TEMPERATURE</span></p>');
									hideSpinner();
									if (current_state == 0) {

										initialReq = true;
										makeInitialRequest();
									}
								}
							}
						);

					function resetToLightReadings() {
						removeAllMarkers();
						if (current_layer != 1)
							legendLight.addTo(map);
						
						if (last_layer == 2)
							legendSound.removeFrom(map);
						else if (last_layer == 3)
							legendTemperature.removeFrom(map);
						/*else if (last_layer == 4)
							legendAccelerometer.removeFrom(map);
						else if (last_layer == 5)
							legendGyro.removeFrom(map);TODO
						*/
						current_layer = 1;
						lightMarkers.addLayer(pruneCluster);
						map.addLayer(lightMarkers);
					}

					function resetToNoiseReadings() {
						removeAllMarkers();
						if (current_layer != 2)
							legendSound.addTo(map);

						if (last_layer == 1)
							legendLight.removeFrom(map);
						else if (last_layer == 3)
							legendTemperature.removeFrom(map);
						/*else if (last_layer == 4)
							legendAccelerometer.removeFrom(map);
						else if (last_layer == 5)
							legendGyro.removeFrom(map);TODO
						*/
						current_layer = 2;
						noiseMarkers.addLayer(pruneCluster);
						map.addLayer(noiseMarkers);
					}

					function resetToMessagesOverlay() {
						removeAllMarkers();

						if (last_layer == 2)
							legendSound.removeFrom(map);
						else if (last_layer == 1)
							legendLight.removeFrom(map);
						else if (last_layer == 3)
							legendTemperature.removeFrom(map);
						/*else if (last_layer == 4)
							legendAccelerometer.removeFrom(map);
						else if (last_layer == 5)
							legendGyro.removeFrom(map);TODO
						*/
						current_layer = 0;
						msgMarkers.addLayer(pruneCluster);
						map.addLayer(msgMarkers);
					}
					
					function resetToTemperatureReadings() {
						removeAllMarkers();
						if (current_layer != 3)
							legendTemperature.addTo(map);

						if (last_layer == 1)
							legendLight.removeFrom(map);
						else if (last_layer == 2)
							legendSound.removeFrom(map);
						/*else if (last_layer == 4)
							legendAccelerometer.removeFrom(map);
						else if (last_layer == 5)
							legendGyro.removeFrom(map);TODO
						*/
						current_layer = 3;

						temperatureMarkers.addLayer(pruneCluster);
						map.addLayer(temperatureMarkers);
					}
					
					/*function resetToAccelerometerReadings() { TODO
						removeAllMarkers();
						if (current_layer != 2)
							legendAccelerometer.addTo(map);

						if (last_layer == 1)
							legendLight.removeFrom(map);
						else if (last_layer == 3)
							legendTemperature.removeFrom(map);
						else if (last_layer == 2)
							legendSound.removeFrom(map);
						else if (last_layer == 5)
							legendGyro.removeFrom(map);

						current_layer = 4;

						accelerometerMarkers.addLayer(pruneCluster);
						map.addLayer(accelerometerMarkers);
					}
					
					function resetToGyroReadings() {
						removeAllMarkers();
						if (current_layer != 2)
							legendGyro.addTo(map);

						if (last_layer == 1)
							legendLight.removeFrom(map);
						else if (last_layer == 3)
							legendTemperature.removeFrom(map);
						else if (last_layer == 4)
							legendAccelerometer.removeFrom(map);
						else if (last_layer == 2)
							legendSound.removeFrom(map);

						current_layer = 5;

						gyroMarkers.addLayer(pruneCluster);
						map.addLayer(gyroMarkers);
					}*/

					function removeAllMarkers() {
						if (DEBUG) {
							console
									.log("*****LOG***** inside removeAllMarkers ");
						}
						markerArray = [];
						hidePopup();
						pruneCluster.RemoveMarkers();
						lightMarkers.clearLayers();
						noiseMarkers.clearLayers();
						//accelerometerMarkers.clearLayers();TODO
						temperatureMarkers.clearLayers();
						//gyroMarkers.clearLayers();TODO
						msgMarkers.clearLayers();
						map.removeLayer(lightMarkers);
						map.removeLayer(noiseMarkers);
						//map.removeLayer(accelerometerMarkers);TODO
						map.removeLayer(msgMarkers);
						map.removeLayer(temperatureMarkers);
						//map.removeLayer(gyroMarkers);TODO
						counter = 0;
						if (DEBUG) {
							console
									.log("*****LOG***** end of  removeAllMarkers ");
						}

					}

					/** *********************************** */

					function getIcon(category, weight) {

						return "images/marker_" + category + "_" + weight
								+ ".png";

					}

					function getRetinaIcon(category, weight) {

						return "images/marker_" + category + "_" + weight
								+ ".png";

					}

					function getLightId(d) {
						return d > 100000 ? 7 : d > 10000 ? 6 : d > 1000 ? 5
								: d > 100 ? 4 : d > 10 ? 3 : d > 5 ? 2
										: d > 0 ? 1 : 0;
					}

					function getNoiseId(d) {
						return d > 140 ? 7 : d > 120 ? 6 : d > 100 ? 5
								: d > 70 ? 4 : d > 50 ? 3 : d > 30 ? 2
										: d > 10 ? 1 : 0;
					}

					function getLightId(d) {
						return d > 100000 ? 7 : d > 10000 ? 6 : d > 1000 ? 5
								: d > 100 ? 4 : d > 10 ? 3 : d > 5 ? 2
										: d > 0 ? 1 : 0;
					}

					function getTemperatureId(d) {
						return d > 40 ? 7 : d > 30 ? 6 : d > 20 ? 5
								: d > 10 ? 4 : d > 0 ? 3 : d > -10 ? 2
										: d > -20 ? 1 : 0;
					}

					/*function getAccelerometerId(d) {
						return d > 140 ? 7 : d > 120 ? 6 : d > 100 ? 5
								: d > 70 ? 4 : d > 50 ? 3 : d > 30 ? 2 TODO
										: d > 10 ? 1 : 0;
					}*/

					/*function getGyroId(d) {
						return d > 140 ? 7 : d > 120 ? 6 : d > 100 ? 5
								: d > 70 ? 4 : d > 50 ? 3 : d > 30 ? 2 TODO
										: d > 10 ? 1 : 0;
					}*/

					function getNoiseColor(d) {
						return d > 140 ? '#800026' : d > 120 ? '#BD0026'
								: d > 100 ? '#E31A1C' : d > 70 ? '#FC4E2A'
										: d > 50 ? '#FD8D3C'
												: d > 30 ? '#FEB24C'
														: d > 10 ? '#FED976'
																: '#FFEDA0';
					}

					function getTemperatureColor(d) {
						return d > 40 ? '#800026' : d > 30 ? '#BD0026'
								: d > 20 ? '#E31A1C' : d > 10 ? '#FC4E2A'
										: d > 0 ? '#FD8D3C'
												: d > -10 ? '#FEB24C'
														: d > -20 ? '#FED976'
																: '#FFEDA0';
					}

					/*function getAccelerometerColor(d) {
						return d > 140 ? '#800026' : d > 120 ? '#BD0026'
								: d > 100 ? '#E31A1C' : d > 70 ? '#FC4E2A'
										: d > 50 ? '#FD8D3C'
												: d > 30 ? '#FEB24C'
														: d > 10 ? '#FED976'
																: '#FFEDA0'; TODO
					}*/

					/*function getGyroColor(d) {
						return d > 140 ? '#800026' : d > 120 ? '#BD0026'
								: d > 100 ? '#E31A1C' : d > 70 ? '#FC4E2A'
										: d > 50 ? '#FD8D3C'
												: d > 30 ? '#FEB24C'
														: d > 10 ? '#FED976'
																: '#FFEDA0'; TODO
					}*/

					function getLightColor(d) {
						return d > 100000 ? '#800026' : d > 10000 ? '#BD0026'
								: d > 1000 ? '#E31A1C' : d > 100 ? '#FC4E2A'
										: d > 10 ? '#FD8D3C'
												: d > 5 ? '#FEB24C'
														: d > 0 ? '#FED976'
																: '#FFEDA0';
					}

					// function getLightColor(d) {
					// return d > 100000 ? '#FFFFFF' : d > 10000 ? '#DADFA2'
					// : d > 1000 ? '#BBBF8C' : d > 100 ? '#9C9F77'
					// : d > 10 ? '#7D8061'
					// : d > 5 ? '#5E604C'
					// : d > 0 ? '#3F4036'
					// : '#212121';
					// }

					function getInnerColor(type) {

						if (type == 0) {
							return '#FFC690';
						} else if (type == 1) {
							return '#1A6A34';
						} else if (type == 2) {
							return '#3A6A34';
						}
					}
					/** ******************************* */
					var pruneCluster = new PruneClusterForLeaflet();
					pruneCluster.Cluster.Size = 40;
					pruneCluster.Cluster.ENABLE_MARKERS_LIST = true

					// var markersCluster = new L.MarkerClusterGroup(
					// {
					// iconCreateFunction : function(cluster) {
					//
					// var markers = cluster.getAllChildMarkers();
					// var markersCount = markers.length;
					// var width = 0;
					// var height = 0;
					//
					// if (markersCount < 10) {
					// width = 15;
					// height = 15;
					// } else if (markersCount < 1000) {
					// width = 20;
					// height = 20;
					// } else if (markersCount < 10000) {
					// width = 25;
					// height = 25;
					// } else {
					// width = 30;
					// height = 30;
					// }
					//
					// var bgColor = getMarkerClusterColor(cluster
					// .getAllChildMarkers());
					//
					// return new L.DivIcon(
					// {
					// html : '<div style = "width:'
					// + width
					// + 'px; height:'
					// + height
					// + 'px; border-radius:50%; font-size:10px; color:#000;
					// line-height: '
					// + height
					// + 'px; text-align:center; background:'
					// + bgColor
					// + '">'
					// + cluster
					// .getChildCount()
					// + '</div>',
					//
					// className : 'cluster',
					// iconSize : L.point(0, 0)
					// });
					// },
					// disableClusteringAtZoom : 10,
					// maxClusterRadius : 50,
					// showCoverageOnHover : true
					// });

					function getMarkerClusterColor(markers) {
						var sum;
						var lightLayerFlag;
						for (var i = 0; i < markers.length; i++) {
							if (i == 0) {
								if (markers[i].options.type == 0)
									lightLayerFlag = true
								else
									lightLayerFlag = false;
							}

							sum = markers[i].options.value;
						}
						var avg = sum / markers.length;

						// if (lightLayerFlag)
						// return getLightColor(avg);
						// else
						return getNoiseColor(avg);
					}
					;

					lightMarkers.addLayer(pruneCluster);

					function addMarker(msg) {

						if (DEBUG) {
							console
									.log("*****LOG***** inside method addMarker -- lat = "
											+ msg.geometry.coordinates[0]
											+ ", long = "
											+ msg.geometry.coordinates[1])

						}

						if ((msg.geometry.coordinates[0] == 0 && msg.geometry.coordinates[1] == 0)
								|| (isNaN(msg.geometry.coordinates[0]))
								|| isNaN(msg.geometry.coordinates[1])) {
							if (DEBUG) {
								console
										.log("*****WARNING***** coordinates are null");
							}

							hideSpinner();

							return false;

						} else {
							if (DEBUG) {
								console.log("*****LOG***** ADDING MARKER");
							}
							counter++;
							if (msg.properties.readingType == 0
									&& current_layer == 1) {

								var lightMarker = new PruneCluster.Marker(
										msg.geometry.coordinates[0],
										msg.geometry.coordinates[1]);
								lightMarker.data.popup = '<p style="color:black" align="center"><strong>'
										+ msg.properties.level
										+ '</strong> lux<br>';
								// +msg.geometry.coordinates[0]+',
								// '+msg.geometry.coordinates[1];

								// TODO --- BUg here since lightMarker.data.name
								// is undefined, set it to current time. This
								// might cause problem with Time-machine
								// feature.
								if (msg.properties.recordTime === undefined) {
									lightMarker.data.name = new Date()
											.getTime();
								} else
									lightMarker.data.name = msg.properties.recordTime;

								// lightMarker.data.id =
								// msg.properties.readingType;
								//TODO msg.properties.level says the value of the marker
								lightMarker.data.weight = getLightId(msg.properties.level); // Weight
								// is
								// the
								// level
								// of
								// Light
								// or
								// Noise
								lightMarker.data.category = msg.properties.readingType; // Category
								// is
								// readingType
								lightMarker.weight = getLightId(msg.properties.level);

								markerArray.push(lightMarker);
								pruneCluster.RegisterMarker(lightMarker);
								
								showPopup(L.latLng(msg.geometry.coordinates[0],msg.geometry.coordinates[1]), lightMarker.data.popup);

							} else if (msg.properties.readingType == 1
									&& current_layer == 2) {
								var noiseMarker = new PruneCluster.Marker(
										msg.geometry.coordinates[0],
										msg.geometry.coordinates[1]);
								noiseMarker.data.popup = '<p style="color:black"  ><strong>'
										+ msg.properties.level
										+ '</strong> db<br>';
								// +msg.geometry.coordinates[0]+',
								// '+msg.geometry.coordinates[1];

								// TODO --- required for initial request coz
								// timemachine data does not send time.
								// BUg here since NoiseMarker.data.name is
								// undefined, set it to current time. This might
								// cause problem with Time-machine feature.
								if (msg.properties.recordTime === undefined) {
									noiseMarker.data.name = new Date()
											.getTime();
								} else
									noiseMarker.data.name = msg.properties.recordTime;

								noiseMarker.data.weight = getNoiseId(msg.properties.level); // Weight
								// is
								// the
								// level
								// of
								// Light
								// or
								// Noise
								noiseMarker.data.category = msg.properties.readingType; // Category
								// is
								// readingType
								noiseMarker.weight = getNoiseId(msg.properties.level);
								markerArray.push(noiseMarker);
								pruneCluster.RegisterMarker(noiseMarker);
								showPopup(L.latLng(msg.geometry.coordinates[0],msg.geometry.coordinates[1]), noiseMarker.data.popup);

							} else if (msg.properties.readingType == 2
									&& current_layer == 0) {

								var msgMarker = new PruneCluster.Marker(
										msg.geometry.coordinates[0],
										msg.geometry.coordinates[1]);

								if (containsURLWithHTMLLinks(msg.properties.message)) {
									msgMarker.data.popup = '<p style="color:black" align="center"><strong>'
											+ replaceURLWithHTMLLinks(msg.properties.message)
											+ '</strong>';
									msgMarker.data.weight = 1; // Weight is the
									// level of Light or
									// Noise

								} else {

									msgMarker.data.popup = '<p style="color:black" align="center"><strong>'
											+ (msg.properties.message)
											+ '</strong>';
									msgMarker.data.weight = 0; // Weight is the
									// level of Light or
									// Noise

								}

								// TODO --- required for initial request coz
								// timemachine data does not send time.
								// BUg here since msgMarker.data.name is
								// undefined, set it to current time. This might
								// cause problem with Time-machine feature.
								if (msg.properties.recordTime === undefined) {
									msgMarker.data.name = new Date().getTime();
								} else
									msgMarker.data.name = msg.properties.recordTime;
								msgMarker.data.volatility = msg.properties.volatility;
								msgMarker.data.category = msg.properties.readingType; // Category
								// is
								// readingType

								markerArray.push(msgMarker);
								pruneCluster.RegisterMarker(msgMarker);
								showPopup(L.latLng(msg.geometry.coordinates[0],msg.geometry.coordinates[1]), msgMarker.data.popup);
							} else if (msg.properties.readingType == 5
									&& current_layer == 3) {
								var temperatureMarker = new PruneCluster.Marker(
										msg.geometry.coordinates[0],
										msg.geometry.coordinates[1]);
								temperatureMarker.data.popup = '<p style="color:black"  ><strong>'
										+ msg.properties.level
										+ '</strong> &deg;C<br>';
								// +msg.geometry.coordinates[0]+',
								// '+msg.geometry.coordinates[1];

								// TODO --- required for initial request coz
								// timemachine data does not send time.
								// BUg here since TemperatureMarker.data.name is
								// undefined, set it to current time. This might
								// cause problem with Time-machine feature.
								if (msg.properties.recordTime === undefined) {
									temperatureMarker.data.name = new Date()
											.getTime();
								} else
									temperatureMarker.data.name = msg.properties.recordTime;

								temperatureMarker.data.weight = getTemperatureId(msg.properties.level); // Weight
								// is
								// the
								// level
								// of
								// Light
								// or
								// Temperature
								temperatureMarker.data.category = msg.properties.readingType; // Category
								// is
								// readingType
								temperatureMarker.weight = getTemperatureId(msg.properties.level);
								markerArray.push(temperatureMarker);
								pruneCluster.RegisterMarker(temperatureMarker);
								showPopup(L.latLng(msg.geometry.coordinates[0],msg.geometry.coordinates[1]), temperatureMarker.data.popup);

							} else if (msg.properties.readingType == 3
									&& current_layer == 4) {
								var accelerometerMarker = new PruneCluster.Marker(
										msg.geometry.coordinates[0],
										msg.geometry.coordinates[1]);
								accelerometerMarker.data.popup = '<p style="color:black"  ><strong>'
										+ msg.properties.level
										+ '</strong> db<br>';
								// +msg.geometry.coordinates[0]+',
								// '+msg.geometry.coordinates[1];

								// TODO --- required for initial request coz
								// timemachine data does not send time.
								// BUg here since AccelerometerMarker.data.name is
								// undefined, set it to current time. This might
								// cause problem with Time-machine feature.
								if (msg.properties.recordTime === undefined) {
									accelerometerMarker.data.name = new Date()
											.getTime();
								} else
									accelerometerMarker.data.name = msg.properties.recordTime;

								accelerometerMarker.data.weight = getAccelerometerId(msg.properties.level); // Weight
								// is
								// the
								// level
								// of
								// Light
								// or
								// Accelerometer
								accelerometerMarker.data.category = msg.properties.readingType; // Category
								// is
								// readingType
								accelerometerMarker.weight = getAccelerometerId(msg.properties.level);
								markerArray.push(accelerometerMarker);
								pruneCluster.RegisterMarker(accelerometerMarker);
								showPopup(L.latLng(msg.geometry.coordinates[0],msg.geometry.coordinates[1]), accelerometerMarker.data.popup);

							} else if (msg.properties.readingType == 4
									&& current_layer == 5) {
								var gyroMarker = new PruneCluster.Marker(
										msg.geometry.coordinates[0],
										msg.geometry.coordinates[1]);
								gyroMarker.data.popup = '<p style="color:black"  ><strong>'
										+ msg.properties.level
										+ '</strong> db<br>';
								// +msg.geometry.coordinates[0]+',
								// '+msg.geometry.coordinates[1];

								// TODO --- required for initial request coz
								// timemachine data does not send time.
								// BUg here since GyroMarker.data.name is
								// undefined, set it to current time. This might
								// cause problem with Time-machine feature.
								if (msg.properties.recordTime === undefined) {
									gyroMarker.data.name = new Date()
											.getTime();
								} else
									gyroMarker.data.name = msg.properties.recordTime;

								gyroMarker.data.weight = getGyroId(msg.properties.level); // Weight
								// is
								// the
								// level
								// of
								// Light
								// or
								// Gyro
								gyroMarker.data.category = msg.properties.readingType; // Category
								// is
								// readingType
								gyroMarker.weight = getGyroId(msg.properties.level);
								markerArray.push(gyroMarker);
								pruneCluster.RegisterMarker(gyroMarker);
								showPopup(L.latLng(msg.geometry.coordinates[0],msg.geometry.coordinates[1]), gyroMarker.data.popup);

							}

							return true;
						}

					}

					function createIcon(data, category) {
						return L.Icon({

						});
					}

					function replaceURLWithHTMLLinks(text) {

						var exp = /(\b(https?|ftp|file|http):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;

						return text.replace(exp,
								"<a href='$1' target='_blank'>$1</a>");
					}

					function containsURLWithHTMLLinks(text) {
						var exp = /(\b(https?|ftp|file|http):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;

						return text.search(exp) >= 0;
					}

					function getOuterColor(type, d) {
						if (type == 0) {
							return d > 200 ? '#1A6A34' : d > 100 ? '#8CBD31'
									: d > 70 ? '#FEDE00' : d > 50 ? '#FFDB4E'
											: d > 25 ? '#E88A3C'
													: d > 1 ? '#FF4A47'
															: '#FF4A47';
						} else if (type == 1) {
							return d > 70 ? '#1A6A34' : d > 60 ? '#8CBD31'
									: d > 40 ? '#FEDE00' : d > 20 ? '#FFDB4E'
											: d > 10 ? '#E88A3C'
													: d > 1 ? '#FF4A47'
															: '#FF4A47';
						} else if (type == 2) {

						}
					}
					;

					/** ****Update****** */
					var box = L.control.messagebox().addTo(map);

					L.control.liveupdate({
						update_map : function() {
							if (current_state == 0)
								updateMarkerArray();
							// box.show('Counter :' + counter);
						},
						position : 'bottomright',
						interval : 10000
					}).addTo(map).startUpdating();

					function updateMarkerArray() {
						if (DEBUG) {
							console
									.log("*****LOG***** + inside updateMarkerArray()");
						}
						var currentTime = new Date().getTime();
						showSpinner();
						for (var i = 0; i < markerArray.length; i++) {
							var marker = markerArray[i];
							if (marker.data.volatility != -2) {
								if (DEBUG) {
									console
											.log("*****LOG***** + marker.data.volatility = "
													+ marker.data.volatility);
								}
								if (currentTime - marker.data.name >= 60000 * 30) { // 10
																					// minutes
									if (DEBUG) {
										console
												.log("*****LOG***** + clear this marker");
									}
									var myArray = [];
									myArray.push(marker);
									pruneCluster.RemoveMarkers(myArray);
									pruneCluster.ProcessView();
									markerArray.splice(i, 1);
									counter--;
								} else {
									// Permanent marker.
									if (DEBUG) {
										console
												.log("*****LOG***** + do not clear this marker, seconds alive = "
														+ (currentTime - marker.data.name));
									}
									break;
								}

							} else {
								if (DEBUG) {
									console
											.log("*****LOG***** + Volatility is -2");
								}
							}

						}
						hideSpinner();

					}

					/** *******Websocket************* */
					function doConnect() {
						showSpinner();
						if (window.MozWebSocket) {
							console
									.log("This browser supports WebSocket using the MozWebSocket constructor");
							window.WebSocket = window.MozWebSocket;
						} else if (!window.WebSocket) {
							console
									.log("This browser does not have support for WebSocket");
							hideSpinner();
							return;
						}

						//websocket = new WebSocket("ws://129.132.255.27:8446"); 
						websocket = new WebSocket("ws://localhost:8446");//TODO IP
						websocket.onopen = function(evt) {
							onOpen(evt)
						};
						websocket.onclose = function(evt) {
							onClose(evt)
						};
						websocket.onmessage = function(evt) {
							onMessage(evt)
						};
						websocket.onerror = function(evt) {
							onError(evt)
						};
						hideSpinner();
					}

					function doDisconnect() {
						websocket.close()
					}

					function onOpen(evt) {
						// Send an initial message
						websocket.send('WebClient Listening!');

						conButton.state('connected');
						initialReq = true;
						makeInitialRequest();

					}

					function makeInitialRequest() {
						/**
						 * ****God knows why i agreed to do this. this might
						 * backfire*********
						 */
						if (initialReq) {
							changeSocketToTimeMachine();
							var date = new Date();
							sendTimeMachineRequest(current_layer == 0 ? 2 : current_layer == 1 ? 0 : current_layer == 2 ? 1 : current_layer == 3 ? 5 : current_layer == 4 ? 3 : 4, date.getTime() - (60000 * 300000), date.getTime());

						}
						/** ************* */
					}

					function onClose(evt) {
						conButton.state('disconnected');
						showAlert("Server disconnected.\nIf you want to reconnect again, please click on the broken chain icon on the right top corner.");
					}

					function onMessage(evt) {
						if (DEBUG) {
							console.log("*****LOG***** inside onMessage");
							console.log("Message received - " + evt.data);
						}

						hideSpinner();
						var msg = JSON.parse(evt.data);
						var features = msg.features;
						if (Array.isArray(features)) {
							if (DEBUG) {
								console
										.log("*****LOG***** Inside if condition checking if ArrayisArray true with length = "
												+ features.length);
							}
							for (var i = 0; i < features.length; i++) {
								var feature = features[i];

								parseFeature(feature);

							}
							pruneCluster.ProcessView();

							if (initialReq) {
								if (DEBUG) {
									console
											.log("*****LOG***** since it is initial req call changeSocketToRealTime");
								}
								changeSocketToRealTime();
								initialReq = false
								if (DEBUG) {
									console
											.log("*****LOG***** Initial Request set to false");
								}
							}

						} else {
							parseFeature(features);
							pruneCluster.ProcessView();

						}

					}

					function onError(evt) {
						conButton.state('error');
						console.log("WebSocket Error - " + evt.data);
					}

					doConnect();

					function openPopUp(e) {
						var popup = L.popup().setLatLng(e.latlng).setContent(
								'Light Level = ').openOn(map);
					}

					function closePopUp(e) {
						L.popup().close;
					}

					function changeSocketToValuePicker() {
						current_state = 2;
						websocket.send('type=2');
					}
					
					function changeSocketToTimeMachine() {
						current_state = 1;
						websocket.send('type=1');
					}

					function changeSocketToRealTime() {
						current_state = 0;
						websocket.send('type=0');
					}

					function sendTimeMachineRequest(readingType, startTime,
							endTime) {
						showSpinner();
						resetBeforeSendingTimeMachineRequest();
						websocket.send('type=1,' + readingType + ','
								+ startTime + ',' + endTime);
					}
					
					function sendValueRequest(readingType, startValue,
							endValue) {
						showSpinner();
						resetBeforeSendingValueRequest();
						websocket.send('type=2,' + readingType + ','
								+ startValue + ',' + endValue);
					}

					function resetBeforeSendingTimeMachineRequest() {
						removeAllMarkers();

						if (current_layer == 1) {
							lightMarkers.addLayer(pruneCluster);
							map.addLayer(lightMarkers)
						} else if (current_layer == 2) {
							noiseMarkers.addLayer(pruneCluster);
							map.addLayer(noiseMarkers)
						} else if (current_layer == 0) {
							msgMarkers.addLayer(pruneCluster);
							map.addLayer(msgMarkers);
						} else if (current_layer == 3) {
							temperatureMarkers.addLayer(pruneCluster);
							map.addLayer(temperatureMarkers)
						} /*else if (current_layer == 4) { TODO
							accelerometerMarkers.addLayer(pruneCluster);
							map.addLayer(accelerometerMarkers)
						} else if (current_layer == 5) {
							gyroMarkers.addLayer(pruneCluster);
							map.addLayer(gyroMarkers)
						} */
					}
					
					function resetBeforeSendingValueRequest() {
						removeAllMarkers();

						if (current_layer == 1) {
							lightMarkers.addLayer(pruneCluster);
							map.addLayer(lightMarkers)
						} else if (current_layer == 2) {
							noiseMarkers.addLayer(pruneCluster);
							map.addLayer(noiseMarkers)
						} else if (current_layer == 0) {
							msgMarkers.addLayer(pruneCluster);
							map.addLayer(msgMarkers);
						} else if (current_layer == 3) {
							temperatureMarkers.addLayer(pruneCluster);
							map.addLayer(temperatureMarkers)
						} /*else if (current_layer == 4) { TODO
							accelerometerMarkers.addLayer(pruneCluster);
							map.addLayer(accelerometerMarkers)
						} else if (current_layer == 5) {
							gyroMarkers.addLayer(pruneCluster);
							map.addLayer(gyroMarkers)
						} */
					}

					window.prepareTimeMachineReq = function() {

						var txtDate = document.getElementById('txtDate').value;
						var txtTime = document.getElementById('txtTime').value;
						if ((txtDate.length > 0) && (txtTime.length == 0)) {
							showAlert("Please do set a Time.");
							return false;
						} else if ((txtDate.length == 0)
								&& (txtTime.length > 0)) {
							showAlert("Please do set a Date");
							return false;
						} else if ((txtDate.length == 0)
								&& (txtTime.length == 0)) {
							showAlert("Please do set the Date and Time.");
							return false;
						} else {
							var dateAsObject = $('#txtDate').datepicker(
									"getDate");
							var timeAsObject = $('#txtTime').timepicker(
									'getTime', new Date(0));
							var millisec = dateAsObject.getTime()
									+ timeAsObject.getTime()
							var date = new Date(millisec);
							sendTimeMachineRequest(current_layer == 0 ? 2 : current_layer == 1 ? 0 : current_layer == 2 ? 1 : current_layer == 3 ? 5 : current_layer == 4 ? 3 : 4, date.getTime(), date.getTime() + (60000 * 30));

						}

					}
					
					window.prepareValueReq = function() {

						var txtStart = document.getElementById('txtStart').value;
						var txtEnd = document.getElementById('txtEnd').value;
						if ((txtStart.length > 0) && (txtEnd.length == 0)) {
							showAlert("Please do set a end Value.");
							return false;
						} else if ((txtStart.length == 0)
								&& (txtEnd.length > 0)) {
							showAlert("Please do set a start Value");
							return false;
						} else if ((txtStart.length == 0)
								&& (txtEnd.length == 0)) {
							showAlert("Please do set the start and end values.");
							return false;
						} else {
							var startValue = txtStart;
							var endValue = txtEnd;
							sendValueRequest(current_layer == 0 ? 2 : current_layer == 1 ? 0 : current_layer == 2 ? 1 : current_layer == 3 ? 5 : current_layer == 4 ? 3 : 4, startValue, endValue);

						}

					}

					function getStartTime() {
						return 

					}

					function showAlert(alertMsg) {
						$('#alert').dialog(
								// ...which upon when it's opened...
								{
									title : "Alert",
									open : function(event, ui) {
										$(".ui-dialog-titlebar-close",
												ui.dialog | ui).hide();
									},
									modal : true,
									resizable : false,
									closeOnEscape : true,
									buttons : [ {
										text : "Cancel",
										"class" : 'button',
										click : function() {
											// Save code here
											$(this).dialog('close');

										}
									} ],
									dialogClass : ' success-dialog'
								});

						$("#alert").text(alertMsg);

					}

					function showInfo() {

						$('#info').dialog(
								{
									title : "About",
									open : function(event, ui) {
										$(".ui-dialog-titlebar-close",
												ui.dialog | ui).hide();
									},
									modal : true,
									resizable : false,
									closeOnEscape : true,
									buttons : [ {
										text : "OK",
										"class" : 'button',
										click : function() {
											$(this).dialog('close');

										}
									} ],
									dialogClass : ' success-dialog'
								});

					}

					function showHelp() {

						$('#help').dialog(
								{
									title : "Help",
									open : function(event, ui) {
										$(".ui-dialog-titlebar-close",
												ui.dialog | ui).hide();
									},
									modal : true,
									resizable : true,
									closeOnEscape : true,
									buttons : [ {
										text : "OK",
										"class" : 'button',
										click : function() {
											$(this).dialog('close');

										}
									} ],
									minWidth : 400,
									dialogClass : 'success-dialog'
								});

					}

					function showDialog() {
						$('#dialog')
								.dialog(
										{
											title : "Select your mobile platform:",
											open : function(event, ui) {
												$(".ui-dialog-titlebar-close",
														ui.dialog | ui).hide();
											},
											modal : true,
											resizable : false,
											closeOnEscape : true,
											buttons : [
													{
														text : "Android",
														"style" : '<i class="fa fa-android fa-lg"></i>',
														click : function() {
															window
																	.open("https://play.google.com/store/apps/details?id=ch.ethz.coss.nervous.pulse");
															$(this).dialog(
																	'close');

														}
													},
													{
														text : "iOS",
														"class" : 'button',
														click : function() {

															window
																	.open("https://itunes.apple.com/us/app/swarmpulse/id1053129873");
															$(this).dialog(
																	'close');

														}
													},
													{
														text : "Cancel",
														"class" : 'button',
														click : function() {
															// Save code here
															$(this).dialog(
																	'close');

														}
													} ],
											dialogClass : ' success-dialog'
										});

					}

					function parseFeature(feature) {
						return addMarker(feature);
					}

					function showSpinner() {
						/** ********************SPINNER************************** */
						map.spin(true, {
							lines : 11 // The number of lines to
							// draw
							,
							length : 37 // The length of each line
							,
							width : 10 // The line thickness
							,
							radius : 22 // The radius of the inner circle
							,
							scale : 0.5 // Scales overall size of the
							// spinner
							,
							corners : 1 // Corner roundness (0..1)
							,
							color : '#FFF' // #rgb or #rrggbb or array of
							// colors
							,
							opacity : 0.25 // Opacity of the lines
							,
							rotate : 0 // The rotation offset
							,
							direction : 1 // 1: clockwise, -1:
							// counterclockwise
							,
							speed : 1 // Rounds per second
							,
							trail : 60 // Afterglow percentage
							,
							fps : 20 // Frames per second when using
							// setTimeout() as a fallback for CSS
							,
							zIndex : 2e9 // The z-index (defaults to
							// 2000000000)
							,
							className : 'spinner' // The CSS class to assign
							// to the spinner
							,
							top : '50%' // Top position relative to parent
							,
							left : '50%' // Left position relative to parent
							,
							shadow : true // Whether to render a shadow
							,
							hwaccel : false // Whether to use hardware
							// acceleration
							,
							position : 'absolute'
						});

						// setTimeout(function(){ map.spin(false); }, 3000);
						/** ********************SPINNER************************** */
					}

					function hideSpinner() {
						map.spin(false);
					}

					// var hazardIcon = L.icon({
					// iconUrl: "test.png",
					// iconSize: [16, 16],
					// iconAnchor: [8, 8],
					// popupAnchor: [0, 0]
					// });

					/** ********************************************* */

					pruneCluster.BuildLeafletClusterIcon = function(cluster) {
						var c = 'prunecluster prunecluster-';
						var iconSize = 38;
						var maxPopulation = this.Cluster.GetPopulation();
						if (cluster.population < Math.max(10,
								maxPopulation * 0.01)) {
							c += 'small';
						} else if (cluster.population < Math.max(100,
								maxPopulation * 0.05)) {
							c += 'medium';
							iconSize = 40;
						} else {
							c += 'large';
							iconSize = 44;
						}

						if (current_layer == 0) {
							c += "-1-";
							c += 1;
						} else if (current_layer == 1) {
							c += "-1-"; // IMP - changing 0 to 1 as we want
										// Light and noise color legends to be
										// same.
							c += ((cluster.totalWeight / cluster.population)
									.toFixed());
						} else if (current_layer == 2) {
							c += "-1-"
							c += ((cluster.totalWeight / cluster.population)
									.toFixed());
						} else if (current_layer == 3) {
							c += "-1-"
							c += ((cluster.totalWeight / cluster.population)
									.toFixed());
						} else if (current_layer == 4) {
							c += "-1-"
							c += ((cluster.totalWeight / cluster.population)
									.toFixed());
						} else if (current_layer == 5) {
							c += "-1-"
							c += ((cluster.totalWeight / cluster.population)
									.toFixed());
						}

						return new L.DivIcon({
							html : "<div><span>" + cluster.population
									+ "</span></div>",
							className : c,
							iconSize : L.point(iconSize, iconSize)
						});
					}

					pruneCluster.PrepareLeafletMarker = function(marker, data,
							category) {
						marker.setIcon(L.icon({
							iconUrl : getIcon(data.category, data.weight),
							iconRetinaUrl : getRetinaIcon(data.category,
									data.weight),
							iconAnchor : [ 20, 40 ]
						}));

						marker.on('mouseover', function(e) {
//							generatePopup(e, data.popup);
							showPopup(marker.getLatLng(), data.popup);
						});

						marker.on('click', function(e) {
//							generatePopup(e, data.popup);
							showPopup(marker.getLatLng(), data.popup);
						});
						
					

					};


//					var generatePopup = function(e, popupContent) {
//						var clickedPopup = e.target.getPopup();
//						var newPopup = new L.popup({
//							offset : new L.Point(0, -20),
//							closeButton : false,
//							autoPan : false,
//							closeOnClick : true
//						});
//						// If a popup has not already been bound to the
//						// marker, create one
//						// and bind it.
//						if (!clickedPopup) {
//							newPopup.setContent(popupContent).setLatLng(
//									e.latlng).openOn(e.target._map);
//							e.target.bindPopup(newPopup);
//						}
//						// We need to destroy and recreate the popup each
//						// time the marker is
//						// clicked to refresh its position
//						else if (!clickedPopup._isOpen) {
//							var content = clickedPopup.getContent();
//							e.target.unbindPopup(clickedPopup);
//							newPopup.setContent(content).setLatLng(e.latlng)
//									.openOn(e.target._map);
//							e.target.bindPopup(newPopup);
//						}
//					};
					
					
					//L.latLng(50.5, 30.5)
					var popup;
					function showPopup(latlng, content)   {
						var options = {
								  offset:  new L.Point(0, -20),
						closeButton : false,
						autoPan : false,
						closeOnClick : true
								};
						 popup = L.popup(options)
					    .setLatLng(latlng)
					    .setContent(content)
						.openOn(map);
					}
					
					function hidePopup() {
						map.closePopup();
					}
					
					/** ********************************************** */
					
//					
//					var decluster = false;
//					function clusterMarkers() {
//					    if(pruneCluster){
//					        pruneCluster.Cluster.Size = 2;
//					        pruneCluster.Cluster.Margin = 10;
//					        pruneCluster.ProcessView();
//					    }
//					}
//					function declusterMarkers() {
//					    if(pruneCluster){
//					        pruneCluster.Cluster.Size = 35;
//					        pruneCluster.Cluster.Margin = 10;
//					        pruneCluster.ProcessView();
//					    }
//					}
//
//					map.on('zoomend', function () {
//						console.log("map onzoomed called");
////					    if (map.getZoom() > 10) {
////					        if (decluster === false) {
////					        	clusterMarkers()
////					            decluster = true;
////					        }
////					    }else{
////					        if (decluster === true) {
////					            declusterMarkers()
////					            decluster = false;
////					        }
////					    }
//					});
						
						
					resetToMessagesOverlay();
					$('#datePicker').hide(0);
					$('#valuePicker').hide(0);

				});