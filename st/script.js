let dark_color_picker = 
    new ColorPickerControl({ container: document.querySelector('.color-picker-dark-theme'), theme: 'dark' });

let light_color_picker = 
    new ColorPickerControl({ container: document.querySelector('.color-picker-light-theme'), theme: 'light' });

dark_color_picker.on('change', (color) =>  {
    document.getElementById("butterfly").style.setProperty('--butterfly-color', color.toHEX());
    document.getElementById("butterfly").style.setProperty('--butterfly-opacity', color.a / 255);
    light_color_picker.color.fromHSVa(color.h, color.s, color.v, color.a);
});

light_color_picker.on('change', (color) => {
    document.getElementById("butterfly").style.setProperty('--butterfly-color', color.toHEX());
    document.getElementById("butterfly").style.setProperty('--butterfly-opacity', color.a / 255);
    dark_color_picker.color.fromHSVa(color.h, color.s, color.v, color.a);
});

changeTheme = (e) => document.querySelector('.flip-container').dataset.flipped = (e.value == 'light');