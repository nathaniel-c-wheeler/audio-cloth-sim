// (launch with s.ck)

// the patch
SinOsc s => JCRev r => Dyno d => dac;
.5 => s.gain;
.1 => r.mix;

// create our OSC receiver
OscRecv recv;
7500 => recv.port;
// start listening (launch thread)
recv.listen();

// create an address in the receiver, store in new variable
recv.event( "/osc/vel, s" ) @=> OscEvent @ oe;

// infinite event loop
while( true )
{
    // wait for event to arrive
    oe => now;

    // grab the next message from the queue.
    while( oe.nextMsg() )
    {
        // getFloat fetches the expected float (as indicated by "i f")
        oe.getString() => string str;
        Std.atoi(str) => Std.mtof => s.freq;


        // print
        <<< "got (via OSC):", str >>>;
    }
}
