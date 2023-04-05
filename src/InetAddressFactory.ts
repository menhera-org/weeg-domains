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

import { Ipv4Address } from "./Ipv4Address.js";
import { Ipv6Address } from "./Ipv6Address.js";
import { InetAddress } from "./InetAddress.js";

export class InetAddressFactory {
  public static createFromString(address: string): InetAddress {
    if (address.includes(':')) {
      return Ipv6Address.fromString(address);
    } else {
      return Ipv4Address.fromString(address);
    }
  }

  public static createFromByteArray(bytes: Uint8Array): InetAddress {
    if (bytes.length === 4) {
      return Ipv4Address.fromByteArray(bytes);
    } else {
      return Ipv6Address.fromByteArray(bytes);
    }
  }
}
