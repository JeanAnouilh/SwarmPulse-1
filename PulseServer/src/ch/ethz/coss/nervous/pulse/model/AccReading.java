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
package ch.ethz.coss.nervous.pulse.model;

import java.io.Serializable;

public class AccReading extends Visual implements Serializable {

	public double x, y, z;

	public AccReading() {
		
	}
	
	public AccReading(String uuid, double x, double y, double z, long timestamp, long volatility, VisualLocation location) {
		type = 3;
		this.uuid = uuid;
		this.x = x;
		this.y = y;
		this.z = z;
		this.timestamp = timestamp;
		this.volatility = volatility;
		this.location = location;
		serialVersionUID = 3L;
	}

	@Override
	public String toString() {
		return "AccReading = (" + "," + timestamp + ") -> " + "(" + x + "," + y + "," + z + ")";
	}
}
