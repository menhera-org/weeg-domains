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

import { HostnameService } from "./HostnameService";

export class UrlService {
  private static readonly PRIVILEGED_SCHEMES = new Set([
    'about',
    'chrome',
    'javascript',
    'data',
    'file',
  ]);

  private static readonly HOSTNAME_SERVICE = HostnameService.getInstance();

  private static readonly INSTANCE = new UrlService();

  public static getInstance(): UrlService {
    return UrlService.INSTANCE;
  }

  private constructor() {
    // nothing.
  }

  public isStringValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }

  public isPrivilegedScheme(url: URL): boolean {
    return UrlService.PRIVILEGED_SCHEMES.has(url.protocol.slice(0, -1));
  }

  public isHttpScheme(url: URL): boolean {
    return url.protocol === 'http:' || url.protocol === 'https:';
  }

  public getEncodedUrl(url: string): string {
    return new URL(url).href;
  }

  public getDecodedUrl(url: string): string {
    const urlObj = new URL(url);
    if (urlObj.protocol != "http:" && urlObj.protocol != "https:") {
      return url;
    }
    return urlObj.protocol + "//" + UrlService.HOSTNAME_SERVICE.getDecodedDomain(urlObj.hostname) + decodeURI(urlObj.pathname) + decodeURI(urlObj.search) + decodeURI(urlObj.hash);
  }
}
