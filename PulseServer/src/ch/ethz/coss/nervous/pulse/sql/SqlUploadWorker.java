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
 *  Dario Leuchtmann - ldario@student.ethz.ch - Add Acc and Gyro
 *******************************************************************************/
package ch.ethz.coss.nervous.pulse.sql;

import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.EOFException;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.Socket;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.List;

import ch.ethz.coss.nervous.pulse.PulseWebSocketServer;
import ch.ethz.coss.nervous.pulse.model.AccReading;
import ch.ethz.coss.nervous.pulse.model.GyroReading;
import ch.ethz.coss.nervous.pulse.model.LightReading;
import ch.ethz.coss.nervous.pulse.model.NoiseReading;
import ch.ethz.coss.nervous.pulse.model.TextVisual;
import ch.ethz.coss.nervous.pulse.model.TemperatureReading;
import ch.ethz.coss.nervous.pulse.model.Visual;
import ch.ethz.coss.nervous.pulse.socket.ConcurrentSocketWorker;
import ch.ethz.coss.nervous.pulse.utils.Log;
import flexjson.JSONDeserializer;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParseException;
import com.google.gson.JsonPrimitive;

public class SqlUploadWorker extends ConcurrentSocketWorker {

	Connection connection;
	SqlSetup sqlse;

	public SqlUploadWorker(Socket socket, PulseWebSocketServer ps, Connection connection, SqlSetup sqlse) {
		super(socket, ps);
		this.connection = connection;
		this.sqlse = sqlse;
	}

	//@SuppressWarnings("deprecation")
	@Override
	public void run() {
		// InputStream is;
		DataInputStream in = null;

		try {
			in = new DataInputStream(socket.getInputStream());
			boolean connected = true;
			while (connected) {
				connected &= !socket.isClosed();
				Visual reading = null;
				JsonObject featureCollection = new JsonObject();
				JsonArray features = new JsonArray();
				JsonObject feature = null;
				try {
					// String json = in.readUTF();

					// StringBuffer json = new StringBuffer();
					// String tmp;
					String json = null;
					try {
						// while ((tmp = in.read()) != null) {
						// json.append(tmp);
						// }

						ByteArrayOutputStream baos = new ByteArrayOutputStream();
						byte buffer[] = new byte[1024];
						for (int s; (s = in.read(buffer)) != -1;) {
							baos.write(buffer, 0, s);
						}
						byte result[] = baos.toByteArray();
						json = new String(result);

						// use inputLine.toString(); here it would have whole
						// source
						in.close();
					} catch (MalformedURLException me) {
						System.out.println("MalformedURLException: " + me);
					} catch (IOException ioe) {
						System.out.println("IOException: " + ioe);
					}
					System.out.println("JSON STRING = " + json);
					System.out.println("JSON Length = " + json.length());
					
					if (json.length() <= 0)
						continue;
					//Edit JSON STRING
					if(json.indexOf("HTTP") != -1) {
						json = json.substring(json.indexOf("{"));
						System.out.println("NEW JSON STRING = " + json);
						System.out.println("NEW JSON Length = " + json.length());
						connected = false;
					}
					
					reading = new JSONDeserializer<Visual>().deserialize(json, Visual.class);
					feature = new JsonObject();

					feature.addProperty("type", "Feature");
					// JsonArray featureList = new JsonArray();
					// iterate through your list
					// for (ListElement obj : list) {
					// {"geometry": {"type": "Point", "coordinates":
					// [-94.149, 36.33]}
					JsonObject point = new JsonObject();
					point.addProperty("type", "Point");
					// construct a JSONArray from a string; can also use an
					// array or list
					JsonArray coord = new JsonArray();
					if (reading == null || reading.location == null)
						continue;
					else if (reading.location.latnLong[0] == 0 && reading.location.latnLong[1] == 0)
						continue;

					coord.add(new JsonPrimitive(new String("" + reading.location.latnLong[0])));
					coord.add(new JsonPrimitive(new String("" + reading.location.latnLong[1])));

					point.add("coordinates", coord);
					feature.add("geometry", point);

					JsonObject properties = new JsonObject();
					if (reading.type == 0) {
						// System.out.println("Reading instance of light");
						properties.addProperty("readingType", "" + 0);
						properties.addProperty("level", "" + ((LightReading) reading).lightVal);
					} else if (reading.type == 1) {
						properties.addProperty("readingType", "" + 1);
						properties.addProperty("level", "" + ((NoiseReading) reading).soundVal);
					} else if (reading.type == 2) {
						properties.addProperty("readingType", "" + 2);
						properties.addProperty("message", "" + ((TextVisual) reading).textMsg);
					} else if (reading.type == 3) {
						properties.addProperty("readingType", "" + 3);
						properties.addProperty("x", "" + ((AccReading) reading).x);
						properties.addProperty("y", "" + ((AccReading) reading).y);
						properties.addProperty("z", "" + ((AccReading) reading).z);
					} else if (reading.type == 4) {
						properties.addProperty("readingType", "" + 4);
						properties.addProperty("x", "" + ((GyroReading) reading).x);
						properties.addProperty("y", "" + ((GyroReading) reading).y);
						properties.addProperty("z", "" + ((GyroReading) reading).z);
					} else if (reading.type == 5) {
						properties.addProperty("readingType", "" + 5);
						properties.addProperty("level", "" + ((TemperatureReading) reading).temperatureVal);
					} else {
						// System.out.println("Reading instance not known");
					}
					properties.addProperty("recordTime", reading.timestamp);
					properties.addProperty("volatility", reading.volatility);
					feature.add("properties", properties);
					features.add(feature);
					featureCollection.add("features", features);

					if (reading.volatility != 0) {
						/***** SQL insert ********/
						// Insert data
						 System.out.println("before uploading SQL - reading uuid = "+reading.uuid);
						 System.out.println("Reading volatility = "+reading.volatility);
						PreparedStatement datastmt = sqlse.getSensorInsertStatement(connection, reading.type);
						if (datastmt != null) {
							// System.out.println("datastmt - " +
							// datastmt.toString());
							List<Integer> types = sqlse.getArgumentExpectation((long) reading.type);
							datastmt.setString(1, reading.uuid);
							if (reading.type == 0) {
								datastmt.setLong(2, reading.timestamp);
								datastmt.setLong(3, reading.volatility);
								datastmt.setDouble(4, ((LightReading) reading).lightVal);
								datastmt.setDouble(5, reading.location.latnLong[0]);
								datastmt.setDouble(6, reading.location.latnLong[1]);
							} else if (reading.type == 1) {
								datastmt.setLong(2, reading.timestamp);
								datastmt.setLong(3, reading.volatility);
								datastmt.setDouble(4, ((NoiseReading) reading).soundVal);
								datastmt.setDouble(5, reading.location.latnLong[0]);
								datastmt.setDouble(6, reading.location.latnLong[1]);
							} else if (reading.type == 2) {
								datastmt.setLong(2, reading.timestamp);
								datastmt.setLong(3, reading.volatility);
								datastmt.setString(4, ((TextVisual) reading).textMsg);
								datastmt.setDouble(5, reading.location.latnLong[0]);
								datastmt.setDouble(6, reading.location.latnLong[1]);
							} else if (reading.type == 3) {
								datastmt.setLong(2, reading.timestamp);
								datastmt.setLong(3, reading.volatility);
								datastmt.setDouble(4, ((AccReading) reading).x);
								datastmt.setDouble(5, ((AccReading) reading).y);
								datastmt.setDouble(6, ((AccReading) reading).z);
								datastmt.setDouble(7, reading.location.latnLong[0]);
								datastmt.setDouble(8, reading.location.latnLong[1]);
							} else if (reading.type == 4) {
								datastmt.setLong(2, reading.timestamp);
								datastmt.setLong(3, reading.volatility);
								datastmt.setDouble(4, ((GyroReading) reading).x);
								datastmt.setDouble(5, ((GyroReading) reading).y);
								datastmt.setDouble(6, ((GyroReading) reading).z);
								datastmt.setDouble(7, reading.location.latnLong[0]);
								datastmt.setDouble(8, reading.location.latnLong[1]);
							} else if (reading.type == 5) {
								datastmt.setLong(2, reading.timestamp);
								datastmt.setLong(3, reading.volatility);
								datastmt.setDouble(4, ((TemperatureReading) reading).temperatureVal);
								datastmt.setDouble(5, reading.location.latnLong[0]);
								datastmt.setDouble(6, reading.location.latnLong[1]);
							} 
							// System.out.println("datastmt after populating - "
							// + datastmt.toString());

							datastmt.addBatch();
							datastmt.executeBatch();
							datastmt.close();
						}
						/*************/

					}

				} catch (JsonParseException e) {
					System.out.println("can't save json object: " + e.toString());
				}
				// output the result
				// System.out.println("featureCollection=" +
				// featureCollection.toString());

				String message = featureCollection.toString();
				pSocketServer.sendToAll(message);

			}

		} catch (EOFException e) {
			e.printStackTrace();
			Log.getInstance().append(Log.FLAG_WARNING, "EOFException occurred, but ignored it for now.");
		} catch (IOException e) {
			e.printStackTrace();
			Log.getInstance().append(Log.FLAG_WARNING, "Opening data stream from socket failed");
		} catch (Exception e) {
			e.printStackTrace();
			Log.getInstance().append(Log.FLAG_WARNING, "Generic error");
		} finally {
			cleanup();
			try {
				in.close();
				in = null;
			} catch (IOException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
				;
			}
		}
	}

	@Override
	protected void cleanup() {
		super.cleanup();
		try {
			connection.close();
		} catch (SQLException e) {
			Log.getInstance().append(Log.FLAG_ERROR, " Error in closing connection.");
		}
	}
}
