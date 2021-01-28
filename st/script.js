let color_pickers = [
    new ColorPickerControl({ container: document.querySelector('.color-picker-dark-theme'), theme: 'dark' }),
    new ColorPickerControl({ container: document.querySelector('.color-picker-light-theme'), theme: 'light' })
];

color_pickers.forEach(color_picker => {
    color_picker.on('change', function(color){
        document.getElementById("butterfly").style.setProperty('--butterfly-color', color.toHEX());
        document.getElementById("butterfly").style.setProperty('--butterfly-opacity', color.a / 255);
        color_pickers.filter(p=>p!=color_picker).forEach((p) => { 
            p.color.fromHSVa(color.h, color.s, color.v, color.a);
            p.update(false);
        });
    });
});

changeTheme = (e) => document.querySelector('.flip-container').dataset.flipped = (e.value == 'light');