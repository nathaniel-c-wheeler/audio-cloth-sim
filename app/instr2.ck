// (launch with s.ck)

// the patch
Wurley s => JCRev r => Dyno d => dac.chan(1);;
.5 => s.gain;
.1 => r.mix;

// create our OSC receiver
OscRecv recv;
7500 => recv.port;
// start listening (launch thread)
recv.listen();

// create an address in the receiver, store in new variable
recv.event( "/osc/acl, s" ) @=> OscEvent @ oe;
0 => int prev;
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
        Std.atoi(str) => int i;
        if (i==prev)
          continue;
        i => prev;
        i=> Std.mtof => s.freq;
        s.noteOn(1);

        400::ms => now;
        s.noteOff(1);

        // print
        <<< "got (via OSC):", str >>>;
    }
}
