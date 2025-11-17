import pika
import json
import logging
import threading

logger = logging.getLogger(__name__)

def publish_event(event_type, event_body, rabbitmq_host='rabbitmq'):
    try:
        connection = pika.BlockingConnection(pika.ConnectionParameters(rabbitmq_host))
        channel = connection.channel()
        channel.exchange_declare(exchange='ransomware_events', exchange_type='topic', durable=True)

        routing_key = event_type
        message = json.dumps(event_body)

        channel.basic_publish(
            exchange='ransomware_events',
            routing_key=routing_key,
            body=message
        )
        connection.close()
    except Exception as e:
        logger.error(f"Failed to publish event {event_type}: {e}")

def _consume_loop(queue_name, binding_keys, handler, rabbitmq_host='rabbitmq'):
    connection = pika.BlockingConnection(pika.ConnectionParameters(rabbitmq_host))
    channel = connection.channel()
    channel.exchange_declare(exchange='ransomware_events', exchange_type='topic', durable=True)
    channel.queue_declare(queue=queue_name, durable=True)
    for key in binding_keys:
        channel.queue_bind(exchange='ransomware_events', queue=queue_name, routing_key=key)

    def _on_message(ch, method, properties, body):
        try:
            payload = json.loads(body.decode('utf-8'))
            handler(method.routing_key, payload)
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            logger.error(f"Error handling event {method.routing_key}: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue=queue_name, on_message_callback=_on_message)
    logger.info(f"Started consumer on queue '{queue_name}' bindings {binding_keys}")
    try:
        channel.start_consuming()
    finally:
        channel.close()
        connection.close()

def start_consumer_thread(queue_name, binding_keys, handler, rabbitmq_host='rabbitmq') -> threading.Thread:
    thread = threading.Thread(
        target=_consume_loop, 
        args=(queue_name, binding_keys, handler, rabbitmq_host),
        daemon=True
    )
    thread.start()
    return thread
