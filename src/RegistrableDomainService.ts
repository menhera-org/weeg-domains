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

import { BackgroundService } from 'weeg-utils';
import { StorageItem } from 'weeg-storage';

import { HostnameService } from './HostnameService.js';

type PublicSuffixListData = {
  rules: string[];
  exceptionRules: string[];
  updatedTime: number;
  initialized: boolean;
};

export class RegistrableDomainService extends BackgroundService<string[], string[]> {
  private static readonly PUBLIC_SUFFIX_LIST_URL = 'https://publicsuffix.org/list/public_suffix_list.dat';
  private static readonly PSL_STORAGE_KEY = "weeg.dns.publicSuffixList";
  private static readonly PSL_UPDATE_INTERVAL = 1000 * 60 * 60 * 24; // 1 day

  private static readonly HOSTNAME_SERVICE = HostnameService.getInstance();

  private publicSuffixListStorage: StorageItem<PublicSuffixListData> | null = null;
  protected initializeBackground() {
    // nothing.
    this.publicSuffixListStorage = new StorageItem<PublicSuffixListData>(RegistrableDomainService.PSL_STORAGE_KEY, {
      rules: [],
      exceptionRules: [],
      updatedTime: 0,
      initialized: false,
    }, StorageItem.AREA_LOCAL);
  }

  private static async fetchList(): Promise<string> {
    const response = await fetch(RegistrableDomainService.PUBLIC_SUFFIX_LIST_URL);
    const text = await response.text();
    return text;
  }

  private static encodeRule(rule: string): string {
    if (rule.startsWith('*.')) {
      const domain = rule.slice(2);
      return '*.' + RegistrableDomainService.HOSTNAME_SERVICE.getEncodedDomain(domain);
    }
    return RegistrableDomainService.HOSTNAME_SERVICE.getEncodedDomain(rule);
  }

  private static parseList(text: string) {
    const lines = text.split('\n');
    const rules = [];
    const exceptionRules = [];
    for (const line of lines) {
      // Skip comments and empty lines.
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('//') || trimmedLine.length === 0) {
        continue;
      }
      if (trimmedLine.startsWith('!')) {
        const rawRule = trimmedLine.slice(1);
        const encodedRule = this.encodeRule(rawRule);
        exceptionRules.push(encodedRule);
      } else {
        const encodedRule = this.encodeRule(trimmedLine);
        rules.push(encodedRule);
      }
    }
    return {rules, exceptionRules};
  }

  private static async fetchRules() {
    const text = await this.fetchList();
    return this.parseList(text);
  }

  private async getRules(): Promise<PublicSuffixListData> {
    if (this.publicSuffixListStorage === null) {
      throw new Error('Not initialized.');
    }
    const data = await this.publicSuffixListStorage.getValue();
    const now = Date.now();
    if (!data.initialized || now - data.updatedTime > RegistrableDomainService.PSL_UPDATE_INTERVAL) {
      const { rules, exceptionRules } = await RegistrableDomainService.fetchRules();
      data.rules = rules;
      data.exceptionRules = exceptionRules;
      data.updatedTime = now;
      data.initialized = true;
      await this.publicSuffixListStorage.setValue(data);
    }
    return data;
  }

  private getHostname(url: string): string {
    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch (e) {
      return '';
    }
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return '';
    }
    return urlObj.hostname;
  }

  private getDnsHostname(url: string): string {
    const hostname = this.getHostname(url);
    if (RegistrableDomainService.HOSTNAME_SERVICE.isHostnameIpAddress(url)) {
      return '';
    }
    return hostname;
  }

  private getKnownPublicSuffix(url: string, ruleData: PublicSuffixListData): string {
    const domain = this.getDnsHostname(url);
    if (domain.length === 0) {
      return '';
    }

    const names = domain.split('.');
    for (let i = 2; i <= names.length; i++) {
      const domain = names.slice(-i).join('.');
      const parentDomain = names.slice(-i + 1).join('.');
      const wildcardDomain = '*.' + parentDomain;
      if (ruleData.exceptionRules.includes(domain)) {
        return parentDomain;
      }
      if (ruleData.exceptionRules.includes(wildcardDomain)) {
        return parentDomain;
      }
    }
    for (let i = 1; i < names.length; i++) {
      const domain = names.slice(i).join('.');
      const parentDomain = names.slice(i + 1).join('.');
      const wildcardDomain = '*.' + parentDomain;
      if (ruleData.rules.includes(domain)) {
        return domain;
      }
      if (ruleData.rules.includes(wildcardDomain)) {
        return domain;
      }
    }
    return '';
  }

  /**
   * Returns the public suffix of the given URL.
   * @param url the url to check
   * @param ruleData the public suffix list data
   * @returns the public suffix of the url, or the empty string if the url is
   * not a valid url or is an IP address.
   * @example getPublicSuffix('https://localhost/') returns 'localhost'
   */
  private getPublicSuffix(url: string, ruleData: PublicSuffixListData): string {
    const domain = this.getDnsHostname(url);
    if (domain.length === 0) {
      return '';
    }
    const knownSuffix = this.getKnownPublicSuffix(url, ruleData);
    if (knownSuffix.length === 0) {
      const parts = domain.split('.');
      return parts.slice(-2).join('.');
    }
    return knownSuffix;
  }

  protected async execute(urls: string[]): Promise<string[]> {
    const ruleData = await this.getRules();
    const registrableDomains = urls.map((url) => {
      const domain = this.getHostname(url);
      if (domain.length === 0) {
        return '';
      }
      const publicSuffix = this.getPublicSuffix(url, ruleData);
      if ('' === publicSuffix) {
        return domain;
      }
      const publicSuffixNamesLength = publicSuffix.split('.').length;
      const parts = domain.split('.');
      return parts.slice(-publicSuffixNamesLength - 1).join('.');
    });
    return registrableDomains;
  }

  /**
   * Returns the registrable domains for the given domains.
   * This is for first party domains, so it does not fail with IP addresses.
   * @param urls The URLs to check. This must be encoded with Punycode.
   * @returns The list of registrable domains, or empty strings if not applicable.
   */
  public async getRegistrableDomains(urls: string[]): Promise<string[]> {
    return this.call(urls);
  }

  public async getUniqueRegistrableDomains(urls: Iterable<string>): Promise<string[]> {
    const domains = [... urls].filter((url) => ['http:', 'https:'].includes(new URL(url).protocol)).map((url) => {
      return new URL(url).hostname;
    });
    const nonIpAddressDomains = [... domains].filter((domain) => {
      return !RegistrableDomainService.HOSTNAME_SERVICE.isHostnameIpAddress(domain);
    });
    const ipAddresses = [... domains].filter((domain) => {
      return RegistrableDomainService.HOSTNAME_SERVICE.isHostnameIpAddress(domain);
    });
    const uniqueDomains = new Set<string>();
    ipAddresses.forEach((ipAddress) => {
      uniqueDomains.add(ipAddress);
    });
    const registrableDomains = await this.getRegistrableDomains(nonIpAddressDomains.map((domain) => `http://${domain}`));
    registrableDomains.forEach((domain) => {
      uniqueDomains.add(domain);
    });
    return RegistrableDomainService.HOSTNAME_SERVICE.sortDomains(uniqueDomains);
  }
}
