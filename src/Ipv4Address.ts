/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
  Copyright (C) 2023 WebExtensions Experts Group

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
  @license
*/

import { InetAddress } from "./InetAddress.js";
import { InetAddressConstructor } from "./InetAddressConstructor.js";
import { InetVersion } from "./InetVersion.js";

export const Ipv4Address: InetAddressConstructor = class Ipv4Address implements InetAddress {
  public readonly version = InetVersion.V4;

  private readonly byteArray = new Uint8Array(4);

  public static fromString(str: string): Ipv4Address {
    const parts = str.split(".");
    if (parts.length != 4) {
      throw new Error("Invalid IPv4 address");
    }
    const numbers = parts.map((part) => {
      const num = parseInt(part, 10);
      if (isNaN(num) || num < 0 || num > 255) {
        throw new Error("Invalid IPv4 address");
      }
      return num;
    });
    const ipv4Address = new Ipv4Address();
    ipv4Address.byteArray.set(numbers);
    return ipv4Address;
  }

  public static fromByteArray(byteArray: Uint8Array): Ipv4Address {
    if (byteArray.length != 4) {
      throw new Error("Invalid IPv4 address");
    }
    const ipv4Address = new Ipv4Address();
    ipv4Address.byteArray.set(byteArray);
    return ipv4Address;
  }

  private constructor() {
    // nothing.
  }

  toByteArray(): Uint8Array {
    return this.byteArray;
  }

  toString(): string {
    return [... this.byteArray].join(".");
  }
}
