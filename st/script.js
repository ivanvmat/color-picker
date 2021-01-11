var color_picker = new ColorPickerControl();
color_picker.on('change', function(color){
    document.getElementById("butterfly").style.setProperty('--butterfly-color', color.toHEX());
});