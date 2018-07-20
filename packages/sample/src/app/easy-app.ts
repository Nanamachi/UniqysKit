import Koa from 'koa'
import Router from 'koa-router'
import BodyParser from 'koa-bodyparser'
import KoaLogger from 'koa-logger'
import axios from 'axios'
import Memcached from 'memcached'
import debug from 'debug'

debug.enable('easy-app*')
const logger = debug('easy-app')

function viaChain (ctx: Koa.Context): string {
  const sender = ctx.header['uniqys-sender']
  console.log(sender)
  if (!(sender && typeof sender === 'string')) ctx.throw(403, 'access via chain required')
  return sender
}

function start (port: number, apiUrl: string, dbUrl: string) {
  const api = axios.create({
    baseURL: `http://${apiUrl}`
  })
  const db = new Memcached(dbUrl)
  const router = new Router()
    .get('/hello', (ctx) => {
      ctx.body = 'Hello Uniqys!'
    })
    .get('/messages/:id', async (ctx) => {
      const id = ctx.params.id
      const message = await new Promise<{ sender: string, contents: string } | undefined>((resolve, reject) => {
        db.get(`messages:${id}`, (err, message) => {
          if (err) return reject(err)
          resolve(message)
        })
      })
      if (!message) return
      ctx.body = {
        id: id,
        sender: message.sender,
        contents: message.contents
      }
    })
    .post('/send', BodyParser(), async (ctx) => {
      const sender = viaChain(ctx)
      const { to, value } = ctx.request.body as { to: string, value: number }
      logger('send %d from %s to %s', value, sender, to)
      await api.post(`/accounts/${sender}/transfer`, { to, value })
      ctx.status = 200
    })
    .post('/messages', BodyParser(), async (ctx) => {
      const sender = viaChain(ctx)
      const { contents } = ctx.request.body as { contents: string }
      logger('post message %s from %s', contents, sender)
      const id = await new Promise<number>((resolve, reject) => {
        db.incr('messages', 1, (err, result) => {
          if (err) return reject(err)
          if (typeof result === 'number') return resolve(result)
          db.set('messages', 1, 0, (err) => {
            if (err) return reject(err)
            resolve(1)
          })
        })
      })
      await new Promise((resolve, reject) => {
        db.set(`messages:${id}`, { sender, contents }, 0, (err) => {
          if (err) return reject(err)
          resolve()
        })
      })
      // get coin :)
      const balance = (await api.get(`/accounts/${sender}/balance`)).data[0]
      await api.put(`/accounts/${sender}/balance`, [balance + 1])
      ctx.body = {
        id: id,
        sender: sender,
        contents: contents
      }
    })
  logger('listen: %d', port)
  new Koa()
    .use(KoaLogger())
    .use(router.routes())
    .use(router.allowedMethods())
    .listen(port)
}

start(56080, 'localhost:56010', 'localhost:56011')
