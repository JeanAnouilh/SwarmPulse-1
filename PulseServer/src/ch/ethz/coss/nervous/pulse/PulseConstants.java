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
package ch.ethz.coss.nervous.pulse;

public class PulseConstants {

	public static String PULSE_LIGHT_LABEL = "Light";
	public static String PULSE_NOISE_LABEL = "Noise";
	public static String PULSE_TEXT_LABEL = "Message";
	public static String PULSE_ACC_LABEL = "Acc";
	public static String PULSE_GYRO_LABEL = "Gyro";
	public static String PULSE_TEMPERATURE_LABEL = "Temperature";

	public static String getLabel(int readingType) {

		switch (readingType) {
		case 0:
		default:
			return PULSE_LIGHT_LABEL;
		case 1:
			return PULSE_NOISE_LABEL;
		case 2:
			return PULSE_TEXT_LABEL;
		case 3:
			return PULSE_ACC_LABEL;
		case 4:
			return PULSE_GYRO_LABEL;
		case 5:
			return PULSE_TEMPERATURE_LABEL;

		}
	}

}
