import { UInt8 } from './bytes'
import { Optional } from './optional'

describe('Optional', () => {
  it('can be some value', () => {
    expect(Optional.some(42)).toBeInstanceOf(Optional)
  })
  it('can be none', () => {
    expect(Optional.none()).toBeInstanceOf(Optional)
  })
  it('can be destructed by match method', () => {
    expect(Optional.some(42).match(v => v, () => 0)).toBe(42)
    expect(Optional.none().match(v => v, () => 0)).toBe(0)
  })
  it('can be checked that it has a value', () => {
    expect(Optional.some(42).hasValue).toBeTruthy()
    expect(Optional.none().hasValue).not.toBeTruthy()
  })
  it('is serializable', () => {
    const deserializer = Optional.deserialize(UInt8.deserialize)
    const some = Optional.some(UInt8.fromNumber(42)).serialize(n => n.serialize())
    expect(deserializer(some).value.match(v => v, () => UInt8.fromNumber(0)).number).toBe(42)
    const none = Optional.none<UInt8>().serialize(n => n.serialize())
    expect(deserializer(none).value.match(v => v, () => UInt8.fromNumber(0)).number).toBe(0)
  })
  it('throw error when deserialize invalid buffer', () => {
    const deserializer = Optional.deserialize(UInt8.deserialize)
    const some = Optional.some(UInt8.fromNumber(42)).serialize(n => n.serialize())
    some.writeUInt8(2, 0) // overwrite label byte
    expect(() => { deserializer(some) }).toThrow()
  })
})
