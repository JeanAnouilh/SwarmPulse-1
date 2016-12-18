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
 * 	 *******************************************************************************/
package ch.ethz.coss.nervous.pulse.sql;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

import ch.ethz.coss.nervous.pulse.Configuration;
import ch.ethz.coss.nervous.pulse.PulseConstants;
import ch.ethz.coss.nervous.pulse.utils.Log;

public class SqlSetup {

	public static final int TYPE_BOOL = 0;
	public static final int TYPE_INT32 = 1;
	public static final int TYPE_INT64 = 2;
	public static final int TYPE_FLOAT = 3;
	public static final int TYPE_DOUBLE = 4;
	public static final int TYPE_STRING = 5;
	public static final int TYPE_LOCATION = 6;

	private Connection con;
	private Configuration config;
	private HashMap<Long, List<Integer>> elementsHash;

	public SqlSetup(Connection con, Configuration config) {
		this.con = con;
		this.config = config;
		// Hash for performance reasons when asking for insert statements
		this.elementsHash = new HashMap<Long, List<Integer>>();
	}

	public void setupTables() {
		// setupTransactionTable();
		setupPulseTables();
	}

	public PreparedStatement getTransactionInsertStatement(Connection con) throws SQLException {
		return con.prepareStatement("INSERT INTO `Transact` (`UUID`, `UploadTime`) VALUES (?,?);");
	}

	public List<Integer> getArgumentExpectation(long sensorId) {
		return elementsHash.get(sensorId);
	}

	public PreparedStatement getSensorInsertStatement(Connection con, int readingType) throws SQLException {
		// System.out.println("inside getSensorInsertStatement - "+readingType);
		// System.out.println("elementsHash - "+elementsHash.size());

		List<Integer> types = elementsHash.get((long) readingType);
		if (types != null) {
			StringBuilder sb = new StringBuilder();
			sb.append("INSERT INTO `ELEMENT_" + PulseConstants.getLabel(readingType) + "` VALUES (DEFAULT,?,?,?,");
			for (int i = 0; i < types.size() - 1; i++) {
				sb.append("?,");
			}
			if (types.size() >= 1) {
				sb.append("?");
			}
			sb.append(");");
			// System.out.println("inside after getSensorInsertStatement");
			return con.prepareStatement(sb.toString());
		} else {
			// System.out.println("inside getSensorInsertStatement returning
			// null");
			return null;
		}

	}

	/**
	 * 
	 * SELECT * FROM `Element_` WHERE RecordTime BETWEEN x and y
	 */

	public PreparedStatement getSensorValuesFetchStatement(Connection con, int readingType, long startTime,
			long endTime) throws SQLException {
		StringBuilder sb = new StringBuilder();
		sb.append("SELECT * FROM `ELEMENT_" + PulseConstants.getLabel(readingType) + "` WHERE RecordTime BETWEEN "
				+ startTime + " AND " + endTime + ";");

		return con.prepareStatement(sb.toString());
	}
	
	/**
	 * 
	 * SELECT * FROM `Element_` WHERE Value BETWEEN x and y
	 */

	public PreparedStatement getSensorValuesFetchStatement2(Connection con, int readingType, long startValue,
			long endValue) throws SQLException {
		StringBuilder sb = new StringBuilder();
		String valueName = PulseConstants.getLabel(readingType);
		if(PulseConstants.getLabel(readingType).equals("Noise")) valueName = "Decibel";
		else if(PulseConstants.getLabel(readingType).equals("Acc")) valueName = "Magnitude";
		else if(PulseConstants.getLabel(readingType).equals("Gyro")) valueName = "Magnitude";
		sb.append("SELECT * FROM `ELEMENT_" + PulseConstants.getLabel(readingType) + "` WHERE " + valueName + " BETWEEN "
				+ startValue + " AND " + endValue + ";");
		System.out.println(sb.toString());

		return con.prepareStatement(sb.toString());
	}

	private void setupPulseTables() {
		for (PulseElementConfiguration element : config.getSensors()) {

			// System.out.println("SetUpPulseTables config.getSensor() size = "
			// + config.getSensors().size());
			List<Integer> types = new ArrayList<Integer>(element.getAttributes().size());
			StringBuilder sb = new StringBuilder();

			sb.append("CREATE TABLE IF NOT EXISTS `" + config.getSqlDatabase() + "`.`ELEMENT_"
					+ PulseConstants.getLabel(element.getElementID().intValue()) + "` (\n");
			sb.append("`RecordID` INT NOT NULL UNIQUE AUTO_INCREMENT,\n");
			sb.append("`UUID` VARCHAR(38) NOT NULL,\n");
			sb.append("`RecordTime` BIGINT UNSIGNED NOT NULL,\n");
			sb.append("`Volatility` BIGINT UNSIGNED NOT NULL,\n");
			for (PulseElementAttribute attribute : element.getAttributes()) {
				types.add(attribute.getType());
				String sqlType = "";
				switch (attribute.getType()) {
				case TYPE_BOOL:
					sqlType = "BIT";
					break;
				case TYPE_INT32:
					sqlType = "INT";
					break;
				case TYPE_INT64:
					sqlType = "BIGINT";
					break;
				case TYPE_FLOAT:
					sqlType = "FLOAT";
					break;
				case TYPE_DOUBLE:
					sqlType = "FLOAT";
					break;
				case TYPE_STRING:
					sqlType = "VARCHAR(255)";
					break;

				case TYPE_LOCATION:
					sqlType = "GEOGRAPHY";
					break;

				default:
					sqlType = "VARCHAR(255)";
					break;
				}
				sb.append("`" + attribute.getName() + "` " + sqlType + " NOT NULL,\n");
			}
			sb.append("PRIMARY KEY (`RecordID`));");
			try {
				String command = sb.toString();
				// System.out.println("SQL STATEMENT : " + command);
				Statement stmt = con.createStatement();
				stmt.execute(command);
				stmt.close();
			} catch (SQLException e) {
				e.printStackTrace();
				Log.getInstance().append(Log.FLAG_ERROR, "Error setting up a sensor table (" + element.getElementName()
						+ ") with SQL statement : (" + sb.toString() + ")");
			}
			// sb = new StringBuilder();
			// sb.append("CREATE INDEX `idx_ELEMENT_"
			// + Long.toHexString(element.getElementID()) + "_UUID` ON `"
			// + config.getSqlDatabase() + "`.`ELEMENT_"
			// + Long.toHexString(element.getElementID()) + "` (`UUID`);");
			// try {
			// String command = sb.toString();
			// Statement stmt = con.createStatement();
			// stmt.execute(command);
			// stmt.close();
			// } catch (SQLException e) {
			// e.printStackTrace();
			// Log.getInstance().append(
			// Log.FLAG_WARNING,
			// "SQL Error setting up a sensor table ("
			// + element.getElementName()
			// + ") index. Index might already exist. SQL statement : ("+
			// sb.toString()+")");
			// } catch (Exception e) {
			// e.printStackTrace();
			// Log.getInstance().append(
			// Log.FLAG_WARNING,
			// "General Exception setting up a sensor table ("
			// + element.getElementName()
			// + ") with SQL statement : ("+ sb.toString()+")");
			// }
			// sb = new StringBuilder();
			// sb.append("CREATE INDEX `idx_ELEMENT_"
			// + Long.toHexString(element.getElementID())
			// + "_RecordTime` ON `" + config.getSqlDatabase()
			// + "`.`ELEMENT_" + Long.toHexString(element.getElementID())
			// + "` (`RecordTime`);");
			// try {
			// String command = sb.toString();
			// Statement stmt = con.createStatement();
			// stmt.execute(command);
			// stmt.close();
			// } catch (SQLException e) {
			// Log.getInstance().append(
			// Log.FLAG_WARNING,
			// "Error setting up a elements table ("
			// + element.getElementName()
			// + ") index. Index might already exist.");
			// }
			elementsHash.put(element.getElementID(), types);
		}
	}

	private void setupTransactionTable() {
		StringBuilder sb = new StringBuilder();
		sb.append("CREATE TABLE IF NOT EXISTS `" + config.getSqlDatabase() + "`.`Transact` (\n");
		sb.append("`RecordID` INT NOT NULL UNIQUE AUTO_INCREMENT,\n");
		sb.append("`UUID` BINARY(16) NOT NULL,\n");
		sb.append("`UploadTime` BIGINT UNSIGNED NOT NULL,\n");
		sb.append("PRIMARY KEY (`RecordID`));\n");
		try {
			String command = sb.toString();
			Statement stmt = con.createStatement();
			stmt.execute(command);
			stmt.close();
		} catch (SQLException e) {
			Log.getInstance().append(Log.FLAG_ERROR, "Error setting up the transaction table");
		}
		sb = new StringBuilder();
		sb.append("CREATE INDEX `idx_Transact_UUID` ON `" + config.getSqlDatabase() + "`.`Transact` (`UUID`);\n");
		try {
			String command = sb.toString();
			Statement stmt = con.createStatement();
			stmt.execute(command);
			stmt.close();
		} catch (SQLException e) {
			Log.getInstance().append(Log.FLAG_WARNING,
					"Error setting up the transaction table index. Index might already exist.");
		}
		sb = new StringBuilder();
		sb.append("CREATE INDEX `idx_Transact_UploadTime` ON `" + config.getSqlDatabase()
				+ "`.`Transact` (`UploadTime`);");
		try {
			String command = sb.toString();
			Statement stmt = con.createStatement();
			stmt.execute(command);
			stmt.close();
		} catch (SQLException e) {
			Log.getInstance().append(Log.FLAG_WARNING,
					"Error setting up the transaction table index. Index might already exist.");
		}
	}

}
