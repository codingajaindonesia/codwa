const DEFAULT_COUNTRY_CODE = '62'; // Ubah sesuai kebutuhan, misalnya untuk Indonesia

const phoneNumberFormatter = function (number) {
  if (!number || typeof number !== 'string') {
        return null;
    }

    // Jika sudah dalam format @g.us (grup), langsung kembalikan tanpa proses lebih lanjut
    if (number.endsWith('@g.us')) {
        return number;
    }

    // Hapus semua karakter non-digit
    let formatted = number.replace(/\D/g, '');

    if (formatted.startsWith('00')) {
        formatted = formatted.slice(2);
    } else if (formatted.startsWith('0')) {
        formatted = DEFAULT_COUNTRY_CODE + formatted.slice(1);
    }

    // Tambahkan @c.us jika belum ada
    if (!formatted.endsWith('@c.us')) {
        formatted += '@c.us';
    }

    return formatted;
};

module.exports = {
    phoneNumberFormatter
};
