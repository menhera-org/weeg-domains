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

/**
 * This class represents an IPv6 address.
 * This does not support interface identifiers.
 */
export const Ipv6Address: InetAddressConstructor = class Ipv6Address implements InetAddress {
  public readonly version = InetVersion.V6;
  private readonly byteArray = new Uint8Array(16);

  public static fromString(address: string): Ipv6Address {
    const ipv6Address = new Ipv6Address();
    const view = new Uint16Array(ipv6Address.byteArray.buffer);
    const parseNumber = (part: string) => {
      const num = parseInt(part, 16);
      if (isNaN(num) || num < 0 || num > 0xffff) {
        throw new Error("Invalid IPv6 address");
      }
      return num;
    };
    let parts: number[];
    if (address.includes('::')) {
      const [left, right] = address.split('::');
      if (!left && !right) {
        // "::"
        return ipv6Address;
      }
      const leftParts = (left ? left.split(':') : []).map(parseNumber);
      const rightParts = (right ? right.split(':') : []).map(parseNumber);
      const missingParts = 8 - leftParts.length - rightParts.length;
      parts = [...leftParts, ...new Array(missingParts).fill(0), ...rightParts];
    } else {
      parts = address.split(':').map(parseNumber);
    }
    if (parts.length != 8) {
      throw new Error("Invalid IPv6 address");
    }
    view.set(parts);
    return ipv6Address;
  }

  public static fromByteArray(byteArray: Uint8Array): Ipv6Address {
    if (byteArray.length != 16) {
      throw new Error("Invalid IPv6 address");
    }
    const ipv6Address = new Ipv6Address();
    ipv6Address.byteArray.set(byteArray);
    return ipv6Address;
  }

  private constructor() {
    // nothing.
  }

  public toByteArray(): Uint8Array {
    return this.byteArray;
  }

  public toString(): string {
    const view = new Uint16Array(this.byteArray.buffer);
    const parts = [...view].map((num) => num.toString(16));
    const longestZeroSequence = parts.reduce((longest, part, index) => {
      if (part === '0') {
        const start = index;
        while (index < parts.length && parts[index] === '0') {
          index++;
        }
        const length = index - start;
        if (length > longest.length) {
          return { start, length };
        }
      }
      return longest;
    }, { start: 0, length: 0 });
    if (longestZeroSequence.length > 1) {
      parts.splice(longestZeroSequence.start, longestZeroSequence.length, '');
    }
    return parts.join(':');
  }
}
