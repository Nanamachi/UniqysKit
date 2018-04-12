import fs from 'fs'
import ejs from 'ejs'
import xmlConverter from 'xml-js'
import axios from 'axios'
import ip from 'internal-ip'
import { Client } from 'node-ssdp'

/* istanbul ignore next */
export namespace NatTraversal {
  export async function discoverRootDeviceAsync (): Promise<any> {
    let client = new Client()

    return new Promise((resolve, reject) => {
      client.on('response', (headers: any) => {
        // 一つ見つかったら返して終わる
        return resolve(headers)
      })

      client.search('upnp:rootdevice')
      // client.search('urn:schemas-upnp-org:service:WANPPPConnection:1')
      // client.search('urn:schemas-upnp-org:service:WANIPConnection:1')

      // ref: NEO's UPnP code
      setTimeout(reject, 3000)
    })
  }

  export async function getRootDeviceInfoAsync (url: string): Promise<any> {
    return axios.get(url)
      .then((res) => {
        return xmlConverter.xml2js(res.data, { compact: true })
      })
  }

  export function findServicesFromDeviceInfo (info: any): object | undefined {
    let isInternetGatewayDevice = false
    let deviceTypes = findKeyRecursive(info, 'deviceType')
    for (let deviceType of deviceTypes) {
      if (deviceType._text.includes('InternetGatewayDevice')) {
        isInternetGatewayDevice = true
      }
    }

    if (!isInternetGatewayDevice) {
      return undefined
    }

    let services = findKeyRecursive(info, 'service')

    /* istanbul ignore next */
    if (services.length === 0) {
      return undefined
    }

    for (let service of services) {
      if (service.serviceType._text.includes('WANIPConnection') && service.controlURL._text) {
        return service
      }
    }

    /* istanbul ignore next */
    return undefined
  }

  export async function getExternalIpAsync (url: string): Promise<any> {
    let template = await renderEjsAsync(__dirname + '/template/get-external-ip.ejs')
    return axios.post(url, template, {
      headers: {
        SOAPACTION: 'urn:schemas-upnp-org:service:WANIPConnection:1#GetExternalIPAddress'
      }
    })
  }

  export async function addPortMappingAsync (url: string): Promise<any> {
    let internalIpAddress = await ip.v4()
    let template = await renderEjsAsync(__dirname + '/template/add-port-mapping.ejs', {
      port: 55962,
      protocol: 'TCP',
      localAddress: internalIpAddress,
      description: 'test'
    })
    return axios.post(url, template, {
      headers: {
        SOAPACTION: 'urn:schemas-upnp-org:service:WANIPConnection:1#AddPortMapping'
      }
    })
  }

  export async function deletePortMappingAsync (url: string): Promise<any> {
    let template = await renderEjsAsync(__dirname + '/template/delete-port-mapping.ejs', {
      port: 55962,
      protocol: 'TCP'
    })
    return axios.post(url, template, {
      headers: {
        SOAPACTION: 'urn:schemas-upnp-org:service:WANIPConnection:1#DeletePortMapping'
      }
    })
  }

  // Promisifyだとオプション指定が消えるので自作
  export function renderEjsAsync (fileName: string, data: any = {}): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readFile(fileName, (err, ejsString) => {
        if (err) return reject(err)
        let template = ejs.render(ejsString.toString().replace(/(\s|\n)/g, ''), data)
        resolve(template)
      })
    })
  }

  export function findKeyRecursive (obj: any, key: string, list: Array<object> = []): Array<any> {
    if (!obj) {
      return list
    }

    // ここ使うかどうか分からない
    /* istanbul ignore next */
    if (obj instanceof Array) {
      for (let i of obj) {
        findKeyRecursive(obj[i], key, list)
      }
    }

    if (obj[key]) {
      list.push(obj[key])
    }

    if (obj !== null && obj instanceof Object) {
      for (let value in obj) {
        findKeyRecursive(obj[value], key, list)
      }
    }

    return list
  }
}
