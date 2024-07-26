;(function () {
    console.clear()
    function _0x3b144b(_0x1416b8) {
      if (_0x1416b8.startsWith('"') && _0x1416b8.endsWith('"')) {
        return _0x1416b8.slice(1, -1)
      }
      return _0x1416b8
    }
    function _0x15ec17(_0x42268c, _0x4e785a) {
      const _0x1829fc = '__telegram__initParams',
        _0x51a66f = _0x42268c.getItem(_0x1829fc)
      if (_0x51a66f !== null) {
        try {
          const _0x4a2210 = JSON.parse(_0x51a66f)
          if (_0x4a2210.tgWebAppData) {
            let _0x51cabc = JSON.stringify(_0x4a2210.tgWebAppData)
            _0x51cabc = _0x3b144b(_0x51cabc)
            console.log('tgWebAppData:', _0x51cabc)
            const _0x212feb = document.createElement('textarea')
            _0x212feb.value = _0x51cabc
            document.body.appendChild(_0x212feb)
            _0x212feb.select()
            document.execCommand('copy')
            document.body.removeChild(_0x212feb)
            console.log('tgWebAppData telah disalin ke clipboard.')
          } else {
            console.log(
              'tgWebAppData tidak ditemukan dalam ' +
                _0x1829fc +
                ' di ' +
                _0x4e785a
            )
          }
        } catch (_0x2044f3) {
          console.log(
            'Gagal mem-parsing nilai dari ' + _0x1829fc + ' di ' + _0x4e785a
          )
        }
      } else {
        console.log(_0x1829fc + ' tidak ditemukan di ' + _0x4e785a)
      }
    }
    console.log('Menampilkan tgWebAppData dari sessionStorage...')
    _0x15ec17(sessionStorage, 'sessionStorage')
    console.log('Menampilkan tgWebAppData dari localStorage...')
    _0x15ec17(localStorage, 'localStorage')
    console.log(
'ㄖ〤⻏㇄ㄩ尺尺丫ﾁ闩⼕🝗'
    )
  })()
  
