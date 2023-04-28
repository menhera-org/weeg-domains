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

import { toUnicode } from "punycode/";
import { Ipv4Address } from "./Ipv4Address.js";
import { Ipv6Address } from "./Ipv6Address.js";

export class HostnameService {
  // This must be at the end of static definitions.
  private static readonly INSTANCE = new HostnameService();
  private static readonly LOCAL_IP_HOSTNAMES: ReadonlySet<string> = new Set([
    '127.0.0.1',
    '[::1]',
  ]);

  public static getInstance(): HostnameService {
    return this.INSTANCE;
  }

  private constructor() {
    // do nothing.
  }

  public getEncodedDomain(domain: string): string {
    return new URL(`http://${domain}`).hostname;
  }

  public getDecodedDomain(domain: string): string {
    return toUnicode(this.getEncodedDomain(domain));
  }

  /**
   * Note this accepts a url, not a hostname.
   */
  public isHostnameIpAddress(url: string): boolean {
    try {
      const { hostname } = new URL(url);
      if (hostname.startsWith("[")) {
        if (hostname.endsWith("]")) {
          const ipv6Address = hostname.slice(1, -1);
          Ipv6Address.fromString(ipv6Address);
          return true;
        }
        throw new Error("Invalid hostname");
      }
      Ipv4Address.fromString(hostname);
      return true;
    } catch (e) {
      return false;
    }
  }

  public isHostnameLocalhost(hostname: string): boolean {
    if (this.isHostnameIpAddress(hostname)) {
      return HostnameService.LOCAL_IP_HOSTNAMES.has(hostname);
    }
    const domainParts = hostname.split(".");
    const domainEnding = domainParts[domainParts.length - 1] as string;
    return domainEnding == 'localhost'; // allow something.localhost
  }

  public compareDomains(domain1: string, domain2: string): number {
    if (domain1 === domain2) {
      return 0;
    } else if (domain1 === '') {
      return -1;
    } else if (domain2 === '') {
      return 1;
    }

    if (this.isHostnameIpAddress(domain1) && this.isHostnameIpAddress(domain2)) {
      return domain1.localeCompare(domain2);
    } else if (this.isHostnameIpAddress(domain1)) {
      return -1;
    } else if (this.isHostnameIpAddress(domain2)) {
      return 1;
    }
    const hostname1 = this.getEncodedDomain(domain1);
    const hostname2 = this.getEncodedDomain(domain2);
    const hostname1Parts = hostname1.split(".");
    const hostname2Parts = hostname2.split(".");
    const hostname1Length = hostname1Parts.length;
    const hostname2Length = hostname2Parts.length;
    const length = Math.min(hostname1Length, hostname2Length);
    for (let i = 0; i < length; i++) {
      const part1 = hostname1Parts[hostname1Length - i - 1] ?? '';
      const part2 = hostname2Parts[hostname2Length - i - 1] ?? '';
      if (part1 !== part2) {
        return part1.localeCompare(part2);
      }
    }
    return hostname1Length - hostname2Length;
  }

  public sortDomains(domains: Iterable<string>): string[] {
    return [...domains].sort((domain1, domain2) => this.compareDomains(domain1, domain2));
  }
}
