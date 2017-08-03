(function($) {
    "use strict"; // Start of use strict

    // jQuery for page scrolling feature - requires jQuery Easing plugin
    $(document).on('click', 'a.page-scroll', function(event) {
        var $anchor = $(this);
        $('html, body').stop().animate({
            scrollTop: ($($anchor.attr('href')).offset().top - 50)
        }, 1250, 'easeInOutExpo');
        event.preventDefault();
    });

    // Highlight the top nav as scrolling occurs
    $('body').scrollspy({
        target: '.navbar-fixed-top',
        offset: 100
    });

    // Closes the Responsive Menu on Menu Item Click
    $('.navbar-collapse ul li a').click(function() {
        $('.navbar-toggle:visible').click();
    });

    // Offset for Main Navigation
    $('#mainNav').affix({
        offset: {
            top: 50
        }
    })

    $('#beta-signup').bootstrapValidator({
        message: "This value is not valid",
        feedbackIcons: {
            valid: 'glyphicon glyphicon-ok',
            invalid: 'glyphicon glyphicon-remove',
            validating: 'glyphicon glyphicon-refresh'
        },
        fields: {
            email: {
                validators: {
                    notEmpty: {
                        message: 'The email address is required'
                    },
                    emailAddress: {
                        message: 'The email address is not valid'
                    }
                }
            }
        }
    }).on('success.form.bv', function(e) {
        e.preventDefault()
        
        var data = $("[name='betaEmail']").val()
        $.post("https://gogreencarbonapp.herokuapp.com/sendEmail", {email:data, subject:"Beta Signup"}, function(result) {
            window.location.assign("thank-you.html");
        });
    });

    $('#contact-form').bootstrapValidator({
//        live: 'disabled',
        message: 'This value is not valid',
        feedbackIcons: {
            valid: 'glyphicon glyphicon-ok',
            invalid: 'glyphicon glyphicon-remove',
            validating: 'glyphicon glyphicon-refresh'
        },
        fields: {
            Name: {
                validators: {
                    notEmpty: {
                        message: 'Please enter your name'
                    }
                }
            },
            email: {
                validators: {
                    notEmpty: {
                        message: 'The email address is required'
                    },
                    emailAddress: {
                        message: 'The email address is not valid'
                    }
                }
            },
            Message: {
                validators: {
                    notEmpty: {
                        message: 'Please enter a message'
                    }
                }
            }
        }
    }).on('success.form.bv', function(e) {
        e.preventDefault()
        var email = $("[name='email']").val()
        var name = $("[name='Name']").val()
        var message = $("[name='Message']").val()
        $.post("https://gogreencarbonapp.herokuapp.com/sendEmail", {email:email, subject:"Contact", name: name, message: message}, function(result) {
            window.alert("Thank you for contacting us. We will get back to you soon");
            window.location.assign("index.html")
        });
    })

})(jQuery); // End of use strict
